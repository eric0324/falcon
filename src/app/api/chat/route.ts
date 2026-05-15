import { getSession } from "@/lib/session";
import { streamText } from "ai";
import {
  processExplicitMemory,
  processPassiveMemory,
  safeRecall,
} from "@/lib/memory/integration";
import { getModel, ModelId, defaultModel, getDefaultMaxOutputTokens } from "@/lib/ai/models";
import {
  createStudioTools,
  suggestDataSourcesTool,
  UPDATE_CODE_DISABLED_TOKEN_THRESHOLD,
} from "@/lib/ai/tools";
import { createScraperTools } from "@/lib/ai/scraper-tools";
import { createImageTools } from "@/lib/ai/image-tools";
import { createAudioTools } from "@/lib/ai/audio-tools";
import type { ImageProvider } from "@/lib/ai/image-generation";
import { createGoogleTools } from "@/lib/ai/google-tools";
import { createNotionTools } from "@/lib/ai/notion-tools";
import { createSlackTools } from "@/lib/ai/slack-tools";
import { createAsanaTools } from "@/lib/ai/asana-tools";
import { createPlausibleTools } from "@/lib/ai/plausible-tools";
import { createGA4Tools } from "@/lib/ai/ga4-tools";
import { createMetaAdsTools } from "@/lib/ai/meta-ads-tools";
import { createGitHubTools } from "@/lib/ai/github-tools";
import { createYouTubeTools } from "@/lib/ai/youtube-tools";
import { createVimeoTools } from "@/lib/ai/vimeo-tools";
import { createWebinarjamTools } from "@/lib/ai/webinarjam-tools";
import { createExternalDbTools } from "@/lib/ai/external-db-tools";
import { buildLayeredSystemPrompt } from "@/lib/ai/system-prompt";
import { isNotionConfigured } from "@/lib/integrations/notion";
import { isSlackConfigured } from "@/lib/integrations/slack";
import { isAsanaConfigured } from "@/lib/integrations/asana";
import { isPlausibleConfigured } from "@/lib/integrations/plausible";
import { isGA4Configured } from "@/lib/integrations/ga4";
import { isMetaAdsConfigured } from "@/lib/integrations/meta-ads";
import { isGitHubConfigured } from "@/lib/integrations/github";
import { isVimeoConfigured } from "@/lib/integrations/vimeo";
import { isWebinarjamConfigured } from "@/lib/integrations/webinarjam";
import { createKnowledgeBaseTools } from "@/lib/ai/knowledge-base-tools";
import { shouldCompact, estimateTokens, estimateMessagesTokens, trimMessagesToFit } from "@/lib/ai/token-utils";
import { compactMessages } from "@/lib/ai/compact";
import { cacheableSystem, cacheableTools } from "@/lib/ai/cache-control";
import { estimateTokens as estimateTokenCount } from "@/lib/ai/token-utils";
import { classifyAttachmentSize, HARD_TOKENS, WARN_TOKENS } from "@/lib/attachments/limits";
import { truncateHead, truncateCsvSmart } from "@/lib/attachments/text-truncate";
import { generateConversationTitle } from "@/lib/ai/generate-title";
import {
  transcribeAudio,
  AudioTranscriptionError,
  AUDIO_PROVIDERS,
  type AudioProvider,
} from "@/lib/integrations/openai-audio";
import { getObjectBuffer } from "@/lib/storage/s3";
import { audioPricing, estimateCost } from "@/lib/ai/models";
import { prisma } from "@/lib/prisma";
import { getMessages, appendMessages } from "@/lib/conversation-messages";
import { checkQuota } from "@/lib/quota";
import { logDataSourceCall, extractDataSourceInfo, sanitizeResponse } from "@/lib/data-source-log";

// Vercel serverless: increase timeout for AI streaming
export const maxDuration = 60;

interface FileData {
  name: string;
  type: string;
  base64: string;
  /** How to handle text files that exceed WARN_TOKENS. Defaults to "head". */
  truncateMode?: "head" | "csv" | "full";
  /** Backend routing hint: "audio" triggers server-side transcription. */
  kind?: "image" | "audio" | "text" | "binary";
  /** S3 key for audio attachments (transcription source). */
  s3Key?: string;
  /** Client-reported duration, used for billing audio when API omits it. */
  durationSec?: number;
}

function formatDurationLabel(seconds?: number): string {
  if (!seconds || !Number.isFinite(seconds)) return "—";
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

async function transcribeAudioAttachment(
  file: FileData,
  userId: string,
  model: AudioProvider | null
): Promise<string> {
  if (!model) {
    // Deliberately omit audioKey so the AI cannot bypass the user's "未選" choice
    // by calling transcribeAudio() with a leaked key. Ask the user to pick a model instead.
    return `[聲音: ${file.name}（使用者未選擇轉錄模型，內容無法讀取。請告訴使用者在工具列選擇一個聲音模型後重送）]`;
  }
  if (!file.s3Key) {
    return `[聲音: ${file.name}（無 s3Key，未轉錄）]`;
  }
  const keyHint = ` (audioKey: ${file.s3Key})`;
  if (!file.s3Key.startsWith(`audios/${userId}/`)) {
    return `[聲音: ${file.name}${keyHint}（s3 路徑不屬於該使用者，未轉錄）]`;
  }

  try {
    const buffer = await getObjectBuffer({ key: file.s3Key });
    const { text, durationSec } = await transcribeAudio(buffer, file.type, { model });
    const reportedDuration = durationSec ?? file.durationSec;
    const minutes = reportedDuration ? Math.max(1, Math.ceil(reportedDuration / 60)) : 1;

    // Bill the transcription. Failure here must not break the chat.
    try {
      await prisma.tokenUsage.create({
        data: {
          userId,
          kind: "audio",
          model,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          units: minutes,
          costUsd: (audioPricing[model] ?? 0) * minutes,
        },
      });
    } catch (e) {
      console.error(`[Chat API] Failed to bill audio transcription:`, e);
    }

    const durationLabel = formatDurationLabel(reportedDuration);
    return `[聲音: ${file.name}${keyHint}, 時長 ${durationLabel}, 轉錄:]\n${text || "(空白)"}`;
  } catch (e) {
    const msg = e instanceof AudioTranscriptionError ? e.message : String(e);
    console.error(`[Chat API] Transcription failed for ${file.s3Key}:`, msg);
    return `[聲音: ${file.name}（轉錄失敗：${msg}）]`;
  }
}

class AttachmentTooLargeError extends Error {
  constructor(public fileName: string, public tokens: number) {
    super(`attachment_too_large: ${fileName} ≈ ${tokens} tokens > ${HARD_TOKENS}`);
  }
}

// MIME types safe to decode as UTF-8 text. Binary files like PDF / zip must
// NOT be decoded — the resulting garbage string would explode token estimates
// and waste model context for no benefit.
const TEXT_READABLE_MIME_PREFIXES = ["text/"];
const TEXT_READABLE_MIME_EXACT = new Set([
  "application/json",
  "application/javascript",
  "application/typescript",
]);

function isTextReadableMime(mime: string): boolean {
  return (
    TEXT_READABLE_MIME_PREFIXES.some((p) => mime.startsWith(p)) ||
    TEXT_READABLE_MIME_EXACT.has(mime)
  );
}

async function buildMessageContent(
  content: string,
  files: FileData[] | undefined,
  userId: string,
  audioModel: AudioProvider | null
): Promise<string | Array<{ type: "text"; text: string } | { type: "image"; image: string; mimeType: string }>> {
  if (!files || files.length === 0) {
    return content;
  }

  const parts: Array<{ type: "text"; text: string } | { type: "image"; image: string; mimeType: string }> = [];

  // Add images first
  for (const file of files) {
    if (file.type.startsWith("image/")) {
      parts.push({
        type: "image",
        image: file.base64,
        mimeType: file.type,
      });
    }
  }

  // Audio files: server-side transcription, inline as text
  const audioFiles = files.filter(
    (f) => f.kind === "audio" || f.type.startsWith("audio/")
  );
  const audioTranscripts = await Promise.all(
    audioFiles.map((f) => transcribeAudioAttachment(f, userId, audioModel))
  );

  // Add non-image, non-audio files as context. Decode to UTF-8 only when it's a text-readable MIME
  // (txt, md, csv, json, code, ...). For binary formats (pdf, etc.) keep a filename hint.
  const nonMediaFiles = files.filter(
    (f) => !f.type.startsWith("image/") && f.kind !== "audio" && !f.type.startsWith("audio/")
  );
  let textContent = content;
  const contextChunks: string[] = [...audioTranscripts];
  if (nonMediaFiles.length > 0) {
    const fileContext = nonMediaFiles
      .map((f) => {
        if (!isTextReadableMime(f.type)) {
          return `[附件: ${f.name}]（${f.type}，二進位檔案，未解析內容）`;
        }
        let raw: string;
        try {
          raw = Buffer.from(f.base64, "base64").toString("utf-8");
        } catch {
          return `[檔案: ${f.name}] (無法解析)`;
        }

        const tokens = estimateTokenCount(raw);
        const sizeClass = classifyAttachmentSize(tokens);

        // Hard limit — bubble up so the API returns 400.
        if (sizeClass === "reject") {
          throw new AttachmentTooLargeError(f.name, tokens);
        }

        // Below WARN — pass through unchanged.
        if (sizeClass === "ok") {
          return `[檔案: ${f.name}]\n${raw}`;
        }

        // WARN zone — apply truncation. Default to "head"; "full" lets the user opt in.
        const mode = f.truncateMode ?? (f.type === "text/csv" ? "csv" : "head");
        if (mode === "full") {
          return `[檔案: ${f.name}（使用者選擇完整送出，約 ${tokens} tokens）]\n${raw}`;
        }
        const result = mode === "csv"
          ? truncateCsvSmart(raw, WARN_TOKENS)
          : truncateHead(raw, WARN_TOKENS);
        return `[檔案: ${f.name}]\n${result.text}`;
      })
      .join("\n\n");
    contextChunks.push(fileContext);
  }
  if (contextChunks.length > 0) {
    textContent = `${content}\n\n附件內容：\n${contextChunks.join("\n\n")}`;
  }

  parts.push({ type: "text", text: textContent });

  return parts;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CoreMessage = any;

export async function POST(req: Request) {
  const session = await getSession();

  if (!session?.user?.email || !session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  try {
    // Quota check — block if over 110%
    const quotaStatus = await checkQuota(userId);
    if (quotaStatus.status === "blocked") {
      return Response.json(
        { error: "quota_exceeded", quota: quotaStatus },
        { status: 403 }
      );
    }

    const { message, model, files, conversationId: incomingConversationId, dataSources, skillPrompt, currentCode, imageProvider, audioProvider, attachedImageKeys, attachments: rawAttachments } = await req.json();

    const audioModel: AudioProvider | null = AUDIO_PROVIDERS.includes(audioProvider)
      ? (audioProvider as AudioProvider)
      : null;

    // Normalise attachments (persist only; LLM view remains driven by files + attachedImageKeys)
    const attachments: import("@/types/message").MessageAttachment[] = Array.isArray(rawAttachments)
      ? (rawAttachments as unknown[])
          .filter((a): a is Record<string, unknown> => !!a && typeof a === "object")
          .map((a) => ({
            name: String(a.name ?? ""),
            type: String(a.type ?? ""),
            size: typeof a.size === "number" ? a.size : 0,
            ...(typeof a.s3Key === "string" ? { s3Key: a.s3Key } : {}),
          }))
          .filter((a) => a.name && a.type)
      : [];

    // Image generation is opt-in: only enabled when the user explicitly picks a provider.
    const imageProviderChoice: ImageProvider | null =
      imageProvider === "imagen" || imageProvider === "gpt-image"
        ? imageProvider
        : null;

    // If the user uploaded images that landed in S3, surface the keys so the
    // model can reference them as sourceImageKey when calling generateImage.
    // Only attach the hint when image generation is actually enabled —
    // otherwise there's no tool to consume the key.
    const uploadedKeys = Array.isArray(attachedImageKeys)
      ? (attachedImageKeys as unknown[]).filter((k): k is string => typeof k === "string")
      : [];
    const messageWithImageHints = imageProviderChoice && uploadedKeys.length > 0
      ? `${message}\n\n[Uploaded images available as sourceImageKey for generateImage: ${uploadedKeys.join(", ")}]`
      : message;

    // User-selected model (falls back to default)
    const selectedModelName = (model || defaultModel) as ModelId;

    // Load conversation history from DB or create new conversation
    let conversationId = incomingConversationId as string | undefined;
    let generatedTitle: string | undefined;
    let historyMessages: Array<{ role: string; content: string; toolCalls?: unknown[] }> = [];

    if (conversationId) {
      // Existing conversation: load history from DB
      historyMessages = await getMessages(conversationId);
    } else {
      // New conversation: create it
      generatedTitle = await generateConversationTitle(message);
      const conv = await prisma.conversation.create({
        data: {
          userId,
          title: generatedTitle,
          model: selectedModelName,
          dataSources: dataSources || undefined,
        },
      });
      conversationId = conv.id;
    }

    const modelName = selectedModelName;
    const selectedModel = await getModel(modelName);

    // Build messages array: history + new user message.
    // Append S3 key hints only to the LLM view — not the user-visible history.
    const messages = [
      ...historyMessages.map((m) => ({ role: m.role, content: m.content, toolCalls: m.toolCalls })),
      { role: "user", content: messageWithImageHints },
    ];

    // Create tools with user context (non-Google tools created eagerly)
    const notionTools = createNotionTools();
    const slackTools = createSlackTools();
    const asanaTools = createAsanaTools();
    const plausibleTools = createPlausibleTools();
    const ga4Tools = createGA4Tools();
    const metaAdsTools = createMetaAdsTools();
    const githubTools = createGitHubTools();

    // 計算現有工具程式碼的 token 數，用來決定是否停用 updateCode。
    // 大工具用 updateCode 整份重寫時，tool_use 的 code 參數會爆 maxOutputTokens buffer、
    // finishReason=length 切掉 tool call，AI 呼叫永遠失敗。拿掉 updateCode 強制走 editCode。
    let existingToolCodeTokens = 0;
    if (conversationId) {
      try {
        const existingTool = await prisma.tool.findUnique({
          where: { conversationId },
          select: { code: true },
        });
        if (existingTool?.code) {
          existingToolCodeTokens = estimateTokens(existingTool.code);
        }
      } catch {
        // best effort — 查不到就當 0，退回原本行為（含 updateCode）
      }
    }
    const existingToolIsLarge =
      existingToolCodeTokens >= UPDATE_CODE_DISABLED_TOKEN_THRESHOLD;

    // Filter tools based on selected data sources
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let filteredTools: Record<string, any> = {
      ...createStudioTools(userId, conversationId, { existingCodeTokens: existingToolCodeTokens }),
    };

    // Only add external tools for explicitly selected data sources
    if (dataSources && dataSources.length > 0) {
      const selectedSources = new Set(dataSources as string[]);

      // Google services - only add if selected, with per-service access control
      const allowedGoogleServices = new Set<string>();
      if (selectedSources.has("google_sheets")) allowedGoogleServices.add("sheets");
      if (selectedSources.has("google_drive")) allowedGoogleServices.add("drive");
      if (selectedSources.has("google_calendar")) allowedGoogleServices.add("calendar");
      if (selectedSources.has("google_gmail")) allowedGoogleServices.add("gmail");
      if (allowedGoogleServices.size > 0) {
        const googleTools = createGoogleTools(userId, allowedGoogleServices);
        filteredTools = { ...filteredTools, ...googleTools };
      }

      // Notion - only if explicitly selected
      if (selectedSources.has("notion")) {
        filteredTools = { ...filteredTools, ...notionTools };
      }

      // Slack - only if explicitly selected
      if (selectedSources.has("slack")) {
        filteredTools = { ...filteredTools, ...slackTools };
      }

      // Asana - only if explicitly selected
      if (selectedSources.has("asana")) {
        filteredTools = { ...filteredTools, ...asanaTools };
      }

      // Plausible - only if explicitly selected
      if (selectedSources.has("plausible")) {
        filteredTools = { ...filteredTools, ...plausibleTools };
      }

      // GA4 - only if explicitly selected
      if (selectedSources.has("ga4")) {
        filteredTools = { ...filteredTools, ...ga4Tools };
      }

      // Meta Ads - only if explicitly selected
      if (selectedSources.has("meta_ads")) {
        filteredTools = { ...filteredTools, ...metaAdsTools };
      }

      // GitHub - only if explicitly selected
      if (selectedSources.has("github")) {
        filteredTools = { ...filteredTools, ...githubTools };
      }

      // YouTube - only if explicitly selected
      if (selectedSources.has("google_youtube")) {
        const youtubeTools = createYouTubeTools(userId);
        filteredTools = { ...filteredTools, ...youtubeTools };
      }

      // Vimeo - only if explicitly selected
      if (selectedSources.has("vimeo")) {
        const vimeoTools = createVimeoTools();
        filteredTools = { ...filteredTools, ...vimeoTools };
      }

      // WebinarJam - only if explicitly selected
      if (selectedSources.has("webinarjam")) {
        const webinarjamTools = createWebinarjamTools();
        filteredTools = { ...filteredTools, ...webinarjamTools };
      }

      // External databases - match extdb_ prefix
      const extDbIds = Array.from(selectedSources)
        .filter((s) => s.startsWith("extdb_"))
        .map((s) => s.replace("extdb_", ""));
      if (extDbIds.length > 0) {
        const extDbTools = createExternalDbTools(userId, extDbIds);
        filteredTools = { ...filteredTools, ...extDbTools };
      }

      // Knowledge bases - match kb_ prefix
      const kbIds = Array.from(selectedSources)
        .filter((s) => s.startsWith("kb_"))
        .map((s) => s.replace("kb_", ""));
      if (kbIds.length > 0) {
        const kbTools = createKnowledgeBaseTools(kbIds);
        filteredTools = { ...filteredTools, ...kbTools };
      }
    }
    // Always register suggestDataSources and scraper tools
    filteredTools = {
      ...filteredTools,
      ...suggestDataSourcesTool,
      ...createScraperTools(),
    };

    // Image generation is opt-in: only register the tool when the user has selected a provider
    if (imageProviderChoice) {
      filteredTools = {
        ...filteredTools,
        ...createImageTools({
          userId,
          conversationId,
          defaultProvider: imageProviderChoice,
        }),
      };
    }

    // Audio transcription tool: always registered so AI can re-process prior audio uploads
    filteredTools = {
      ...filteredTools,
      ...createAudioTools({ userId }),
    };

    // Build list of available-but-unselected data sources for AI to suggest
    const selectedSet = new Set((dataSources as string[]) || []);
    const integrationChecks = await Promise.all([
      isNotionConfigured().then((ok) => ok ? "notion" : null),
      isSlackConfigured().then((ok) => ok ? "slack" : null),
      isAsanaConfigured().then((ok) => ok ? "asana" : null),
      isPlausibleConfigured().then((ok) => ok ? "plausible" : null),
      isGA4Configured().then((ok) => ok ? "ga4" : null),
      isMetaAdsConfigured().then((ok) => ok ? "meta_ads" : null),
      isGitHubConfigured().then((ok) => ok ? "github" : null),
      isVimeoConfigured().then((ok) => ok ? "vimeo" : null),
      isWebinarjamConfigured().then((ok) => ok ? "webinarjam" : null),
    ]);
    const availableSources = integrationChecks
      .filter((id) => id !== null && !selectedSet.has(id)) as string[];

    // Recall personal memories — folded into Volatile segment (per-request)
    const memoryRecall = await safeRecall(message, userId);

    // Fire explicit memory extraction in parallel — don't block stream
    const explicitMemoryPromise = processExplicitMemory(message, userId);

    // Build the per-request volatile extras (memory, skill, currentCode, large-tool notice).
    // These vary on every request and intentionally live outside the cached prefix.
    let volatileExtras = "";
    if (memoryRecall.promptText) {
      volatileExtras += `\n\n${memoryRecall.promptText}`;
    }
    if (skillPrompt && typeof skillPrompt === "string") {
      volatileExtras += `\n\n--- Skill ---\n${skillPrompt}`;
    }
    if (currentCode && typeof currentCode === "string") {
      const editGuidance = existingToolIsLarge
        ? `This tool is large (~${existingToolCodeTokens} tokens) — \`updateCode\` has been disabled. You **must** use \`editCode\` for every change. Even if the user asks to "rewrite" or "redesign", break the work into multiple sequential editCode calls instead of trying to regenerate the whole file.`
        : `You can see and modify this code. For small changes use \`editCode\`; only call \`updateCode\` when the user explicitly asks for a full rewrite.`;
      volatileExtras += `\n\n## Current Tool Code\nThe user is editing an existing tool. Here is the current code:\n\`\`\`jsx\n${currentCode}\n\`\`\`\n${editGuidance}`;
    } else if (existingToolIsLarge) {
      volatileExtras += `\n\n## Large Tool Notice\nThe current tool is large (~${existingToolCodeTokens} tokens); \`updateCode\` has been disabled. Use \`editCode\` for any modification, splitting big changes into multiple calls.`;
    }

    const systemSegments = buildLayeredSystemPrompt({
      dataSources,
      availableSources,
      imageGenerationEnabled: !!imageProviderChoice,
      volatileExtras,
    });
    const systemPrompt = systemSegments.core + systemSegments.capabilities + systemSegments.volatile;

    // Process messages to include files and reconstruct tool call history
    const processedMessages: CoreMessage[] = [];
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i] as { role: string; content: string; toolCalls?: Array<{ id: string; name: string; args: Record<string, unknown>; result?: unknown }> };
      const isLastUserMessage = i === messages.length - 1 && m.role === "user";

      if (m.role === "assistant" && m.toolCalls && m.toolCalls.length > 0) {
        // Reconstruct assistant message with tool calls in AI SDK format
        const contentParts: Array<{ type: string; text?: string; toolCallId?: string; toolName?: string; input?: unknown }> = [];
        if (m.content) {
          contentParts.push({ type: "text", text: m.content });
        }
        for (const tc of m.toolCalls) {
          contentParts.push({
            type: "tool-call",
            toolCallId: tc.id,
            toolName: tc.name,
            input: tc.args,
          });
        }
        processedMessages.push({ role: "assistant", content: contentParts });

        // Every tool-call in the assistant message MUST have a matching tool-result,
        // otherwise the AI SDK rejects the request with AI_MissingToolResultsError.
        // Synthesize a stub result for any stored tool call whose execution never
        // completed (e.g., tool-error, maxOutputTokens mid-tool-use, aborted stream).
        const toolResultParts = m.toolCalls.map((tc) => ({
          type: "tool-result",
          toolCallId: tc.id,
          toolName: tc.name,
          output: {
            type: "text",
            value:
              tc.result !== undefined
                ? JSON.stringify(tc.result)
                : JSON.stringify({ success: false, error: "incomplete_result" }),
          },
        }));
        processedMessages.push({ role: "tool", content: toolResultParts });
      } else {
        // Anthropic rejects empty text content blocks. Legacy/errored turns may
        // have persisted an empty assistant message (e.g., a prior stream failed
        // before any output) — replace with a placeholder so history stays valid
        // instead of breaking the whole request with AI_APICallError.
        const rawContent = isLastUserMessage
          ? await buildMessageContent(m.content, files, userId, audioModel)
          : m.content;
        const content =
          typeof rawContent === "string" && rawContent.length === 0
            ? "(empty message)"
            : rawContent;
        processedMessages.push({
          role: m.role as "user" | "assistant",
          content,
        });
      }
    }

    // Track token usage across all steps.
    // Anthropic returns inputTokens as the *grand total* (noCache + cacheRead + cacheWrite),
    // so we also track the breakdown separately to apply correct cache pricing.
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCacheReadTokens = 0;
    let totalCacheWriteTokens = 0;

    // Auto compact: check if conversation needs compaction
    let compactInfo: { compacted: boolean; originalCount: number; keptCount: number; summary?: string } | null = null;
    let messagesToSend = processedMessages;

    // Estimate overhead from system prompt + tool definitions
    const segmentTokens = {
      core: estimateTokens(systemSegments.core),
      cap: estimateTokens(systemSegments.capabilities),
      vol: estimateTokens(systemSegments.volatile),
    };
    const systemTokens = segmentTokens.core + segmentTokens.cap + segmentTokens.vol;
    const toolsTokens = estimateTokens(JSON.stringify(filteredTools));
    const promptOverhead = systemTokens + toolsTokens;
    console.log(
      `[Chat API] system segments — core=${segmentTokens.core} cap=${segmentTokens.cap} vol=${segmentTokens.vol} total=${systemTokens} / model=${modelName}`
    );

    if (shouldCompact(processedMessages, modelName, promptOverhead)) {
      const messagesTokens = estimateMessagesTokens(processedMessages);
      console.log(
        `[Chat API] Compact triggered — messages=${messagesTokens} (${processedMessages.length} msgs) + system=${systemTokens} + tools=${toolsTokens} = ${messagesTokens + promptOverhead} / model=${modelName}`
      );
      try {
        const result = await compactMessages(processedMessages);
        messagesToSend = result.compactedMessages;
        compactInfo = {
          compacted: true,
          originalCount: result.originalCount,
          keptCount: result.keptCount,
          summary: result.summary,
        };
        console.log(`[Chat API] Compacted: ${result.originalCount} → ${result.keptCount} messages`);

        // Save summary to conversation
        if (conversationId) {
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { summary: result.summary },
          }).catch((e: unknown) => console.error(`[Chat API] Failed to save summary:`, e));
        }
      } catch (e) {
        console.error(`[Chat API] Compact failed, using full messages:`, e);
      }
    }

    // Safety net: hard trim if still too large after compaction
    messagesToSend = trimMessagesToFit(messagesToSend, modelName, promptOverhead);

    // Create streaming response with tool loop
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const enqueue = (data: string) => {
          try { controller.enqueue(encoder.encode(data)); } catch { /* client disconnected */ }
        };
        const MAX_STEPS = 15;
        const currentMessages = [...messagesToSend];
        let step = 0;
        let finalAssistantText = "";
        const finalToolCalls: import("@/types/message").ToolCall[] = [];

        try {

        // Send conversationId (and title if newly created) so frontend can use it
        if (conversationId) {
          enqueue(
            `i:${JSON.stringify({
              conversationId,
              title: generatedTitle,
            })}\n`
          );
        }

        // Send compact event if compaction occurred
        if (compactInfo) {
          const compactLine = `c:${JSON.stringify(compactInfo)}\n`;
          enqueue(compactLine);
        }

        while (step < MAX_STEPS) {
          step++;

          const result = streamText({
            model: selectedModel,
            system: cacheableSystem(systemSegments, modelName),
            messages: currentMessages,
            tools: cacheableTools(filteredTools, modelName),
            maxOutputTokens: getDefaultMaxOutputTokens(modelName),
          });

          let hasToolCalls = false;
          const toolCalls: Array<{ toolCallId: string; toolName: string; args: unknown }> = [];
          const toolResults: Array<{ toolCallId: string; result: unknown }> = [];
          const toolCallTimestamps: Record<string, number> = {};
          for await (const part of result.fullStream) {
            let line = "";

            switch (part.type) {
              case "text-delta":
                finalAssistantText += part.text;
                line = `0:${JSON.stringify(part.text)}\n`;
                break;
              case "tool-call":
                hasToolCalls = true;
                toolCallTimestamps[part.toolCallId] = Date.now();
                toolCalls.push({
                  toolCallId: part.toolCallId,
                  toolName: part.toolName,
                  args: part.input,
                });
                finalToolCalls.push({
                  id: part.toolCallId,
                  name: part.toolName,
                  args: part.input as Record<string, unknown>,
                  status: "calling" as const,
                });
                line = `9:${JSON.stringify({
                  toolCallId: part.toolCallId,
                  toolName: part.toolName,
                  args: part.input,
                })}\n`;
                break;
              case "tool-result": {
                toolResults.push({
                  toolCallId: part.toolCallId,
                  result: part.output,
                });
                // Update finalToolCalls with result
                const ftc = finalToolCalls.find((t) => t.id === part.toolCallId);
                if (ftc) {
                  ftc.status = "completed" as const;
                  ftc.result = part.output;
                }
                line = `a:${JSON.stringify({
                  toolCallId: part.toolCallId,
                  result: part.output,
                })}\n`;
                // Log data source calls
                const tc = toolCalls.find((c) => c.toolCallId === part.toolCallId);
                if (tc) {
                  const info = extractDataSourceInfo(tc.toolName, tc.args as Record<string, unknown>);
                  if (info) {
                    const output = part.output as Record<string, unknown> | undefined;
                    logDataSourceCall({
                      userId,
                      conversationId,
                      source: "chat",
                      dataSourceId: info.dataSourceId,
                      action: info.action,
                      toolName: tc.toolName,
                      params: info.params,
                      response: sanitizeResponse(output),
                      success: output?.success !== false,
                      error: output?.success === false ? (output?.error as string) : undefined,
                      durationMs: Date.now() - (toolCallTimestamps[part.toolCallId] || Date.now()),
                      rowCount: output?.rowCount as number | undefined,
                    });
                  }
                }
                break;
              }
              case "error":
                line = `e:${JSON.stringify({ error: String(part.error) })}\n`;
                break;
            }

            if (line) {
              enqueue(line);
            }
          }

          // Get token usage for this step
          try {
            const usage = await result.usage;
            if (usage) {
              totalInputTokens += usage.inputTokens || 0;
              totalOutputTokens += usage.outputTokens || 0;
              const details = (usage as { inputTokenDetails?: { cacheReadTokens?: number; cacheWriteTokens?: number } }).inputTokenDetails;
              if (details) {
                totalCacheReadTokens += details.cacheReadTokens || 0;
                totalCacheWriteTokens += details.cacheWriteTokens || 0;
              }
            }
            const finishReason = await result.finishReason;
            if (finishReason === "length") {
              console.warn(
                `[Chat API] step=${step} hit maxOutputTokens cap (model=${modelName}, cap=${getDefaultMaxOutputTokens(modelName)})`
              );
            }
          } catch (e) {
            console.error(`[Chat API] Failed to get usage:`, e);
          }

          // If no tool calls, we're done
          if (!hasToolCalls) {
            break;
          }

          // Ensure every tool call has a result. Missing results happen when the
          // SDK emits a tool-error part (not in our switch), the stream aborts
          // between tool-call and tool-result events, or maxOutputTokens truncates
          // a tool_use block mid-execution. Sending a dangling tool_use back to
          // Anthropic triggers AI_MissingToolResultsError on the next step.
          for (const tc of toolCalls) {
            if (!toolResults.some((tr) => tr.toolCallId === tc.toolCallId)) {
              const stub = { success: false, error: "incomplete_result" };
              toolResults.push({ toolCallId: tc.toolCallId, result: stub });
              const ftc = finalToolCalls.find((t) => t.id === tc.toolCallId);
              if (ftc) {
                ftc.status = "completed";
                ftc.result = stub;
              }
              console.warn(
                `[Chat API] synthesized stub result for tool call ${tc.toolCallId} (${tc.toolName})`
              );
            }
          }

          // Add assistant message with tool calls to conversation
          currentMessages.push({
            role: "assistant",
            content: toolCalls.map(tc => ({
              type: "tool-call",
              toolCallId: tc.toolCallId,
              toolName: tc.toolName,
              input: tc.args,
            })),
          });

          // Add tool message with all results
          currentMessages.push({
            role: "tool",
            content: toolResults.map(tr => {
              const toolCall = toolCalls.find(tc => tc.toolCallId === tr.toolCallId);
              return {
                type: "tool-result",
                toolCallId: tr.toolCallId,
                toolName: toolCall?.toolName || "",
                output: {
                  type: "text",
                  value: JSON.stringify(tr.result),
                },
              };
            }),
          });

        }

        // If we exhausted all steps and the last step had tool calls,
        // do one final call WITHOUT tools to force a text response
        if (step >= MAX_STEPS) {
          const finalSegments = {
            ...systemSegments,
            volatile:
              systemSegments.volatile +
              "\n\n（你已用完所有工具呼叫次數，請根據已取得的資料回答使用者。如果資訊不完整，告知使用者你找到了什麼，以及還需要什麼。）",
          };
          const finalResult = streamText({
            model: selectedModel,
            system: cacheableSystem(finalSegments, modelName),
            messages: currentMessages,
            tools: {}, // no tools = force text response
            maxOutputTokens: getDefaultMaxOutputTokens(modelName),
          });

          for await (const part of finalResult.fullStream) {
            if (part.type === "text-delta") {
              enqueue(`0:${JSON.stringify(part.text)}\n`);
            }
          }

          try {
            const usage = await finalResult.usage;
            if (usage) {
              totalInputTokens += usage.inputTokens || 0;
              totalOutputTokens += usage.outputTokens || 0;
              const details = (usage as { inputTokenDetails?: { cacheReadTokens?: number; cacheWriteTokens?: number } }).inputTokenDetails;
              if (details) {
                totalCacheReadTokens += details.cacheReadTokens || 0;
                totalCacheWriteTokens += details.cacheWriteTokens || 0;
              }
            }
            const finishReason = await finalResult.finishReason;
            if (finishReason === "length") {
              console.warn(
                `[Chat API] final fallback hit maxOutputTokens cap (model=${modelName}, cap=${getDefaultMaxOutputTokens(modelName)})`
              );
            }
          } catch (e) {
            console.error(`[Chat API] Failed to get final usage:`, e);
          }
        }

        // Persist new messages (user + assistant) to DB.
        // Skip entirely when the assistant produced nothing — persisting an
        // empty assistant row pollutes history and later trips Anthropic's
        // "text content blocks must be non-empty" check when the conversation
        // is replayed.
        if (conversationId && (finalAssistantText.length > 0 || finalToolCalls.length > 0)) {
          try {
            const newMessages: import("@/types/message").Message[] = [
              {
                role: "user",
                content: message,
                ...(attachments.length > 0 ? { attachments } : {}),
              },
              {
                role: "assistant",
                content: finalAssistantText,
                ...(finalToolCalls.length > 0 ? { toolCalls: finalToolCalls } : {}),
              },
            ];
            await appendMessages(conversationId, newMessages);
          } catch (e) {
            console.error(`[Chat API] Failed to append messages:`, e);
          }
        } else if (conversationId) {
          console.warn(
            `[Chat API] skip persist — empty turn (no text, no tool calls). conversationId=${conversationId}`
          );
        }

        // Save token usage to database
        if (totalInputTokens > 0 || totalOutputTokens > 0) {
          try {
            const costUsd = estimateCost({
              kind: "chat",
              model: modelName,
              inputTokens: totalInputTokens,
              outputTokens: totalOutputTokens,
              cacheReadTokens: totalCacheReadTokens,
              cacheWriteTokens: totalCacheWriteTokens,
            });
            const nonCachedInput = Math.max(
              0,
              totalInputTokens - totalCacheReadTokens - totalCacheWriteTokens
            );
            console.log(
              `[Chat API] tokens model=${modelName} input=${totalInputTokens} (noCache=${nonCachedInput}, cacheRead=${totalCacheReadTokens}, cacheWrite=${totalCacheWriteTokens}) output=${totalOutputTokens} cost=$${costUsd.toFixed(6)}`
            );
            await prisma.tokenUsage.create({
              data: {
                userId,
                kind: "chat",
                model: modelName,
                inputTokens: totalInputTokens,
                outputTokens: totalOutputTokens,
                totalTokens: totalInputTokens + totalOutputTokens,
                cacheReadTokens: totalCacheReadTokens,
                cacheWriteTokens: totalCacheWriteTokens,
                costUsd,
              },
            });

            // Send updated quota status
            try {
              const updatedQuota = await checkQuota(userId);
              enqueue(`q:${JSON.stringify(updatedQuota)}\n`);
            } catch (qe) {
              console.error(`[Chat API] Failed to get quota status:`, qe);
            }
          } catch (e) {
            console.error(`[Chat API] Failed to save token usage:`, e);
          }
        }

        // Memory: emit explicit-extraction result (if any) then fire passive extraction
        try {
          const memoryEvent = await explicitMemoryPromise;
          if (memoryEvent) {
            enqueue(`m:${JSON.stringify(memoryEvent)}\n`);
          }
        } catch (e) {
          console.error(`[Chat API] Memory event emit failed:`, e);
        }

        if (conversationId && finalAssistantText.length > 0) {
          const recentForPassive = [
            ...messages.slice(-5).map((m: { role: string; content: string }) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            })),
            { role: "assistant" as const, content: finalAssistantText },
          ];
          // Fire-and-forget; never blocks response close
          processPassiveMemory(recentForPassive, userId, conversationId).catch(
            (e) => console.error(`[Chat API] passive memory failed:`, e)
          );
        }

        } catch (streamError) {
          // Ignore abort errors — client disconnected
          if (streamError instanceof Error && streamError.name === "AbortError") return;
          console.error(`[Chat API] Stream error:`, streamError);
          try {
            const errorMsg = streamError instanceof Error ? streamError.message : String(streamError);
            enqueue(`e:${JSON.stringify({ error: errorMsg })}\n`);
          } catch { /* controller already closed */ }
        } finally {
          try { controller.close(); } catch { /* already closed */ }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    if (error instanceof AttachmentTooLargeError) {
      return Response.json(
        {
          error: "attachment_too_large",
          fileName: error.fileName,
          tokens: error.tokens,
          limit: HARD_TOKENS,
        },
        { status: 400 }
      );
    }
    console.error("Chat API error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
