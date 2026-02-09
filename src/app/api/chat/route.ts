import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { streamText } from "ai";
import { models, ModelId, defaultModel } from "@/lib/ai/models";
import { studioTools } from "@/lib/ai/tools";
import { createGoogleTools } from "@/lib/ai/google-tools";
import { createNotionTools } from "@/lib/ai/notion-tools";
import { createSlackTools } from "@/lib/ai/slack-tools";
import { createAsanaTools } from "@/lib/ai/asana-tools";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { shouldCompact } from "@/lib/ai/token-utils";
import { compactMessages } from "@/lib/ai/compact";
import { prisma } from "@/lib/prisma";

interface FileData {
  name: string;
  type: string;
  base64: string;
}

function buildMessageContent(
  content: string,
  files?: FileData[]
): string | Array<{ type: "text"; text: string } | { type: "image"; image: string; mimeType: string }> {
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

  // Add text files as context
  const textFiles = files.filter((f) => !f.type.startsWith("image/"));
  let textContent = content;
  if (textFiles.length > 0) {
    const fileContext = textFiles
      .map((f) => {
        try {
          return `[檔案: ${f.name}]\n${Buffer.from(f.base64, 'base64').toString('utf-8')}`;
        } catch {
          return `[檔案: ${f.name}] (無法解析)`;
        }
      })
      .join("\n\n");
    textContent = `${content}\n\n附件內容：\n${fileContext}`;
  }

  parts.push({ type: "text", text: textContent });

  return parts;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CoreMessage = any;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || !session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  try {
    const { messages, model, files, conversationId, dataSources } = await req.json();

    // Use specified model or default
    const selectedModel = models[(model as ModelId) || defaultModel];

    // Create tools with user context
    const googleTools = createGoogleTools(userId);
    const notionTools = createNotionTools();
    const slackTools = createSlackTools();
    const asanaTools = createAsanaTools();

    // Filter tools based on selected data sources
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let filteredTools: Record<string, any> = { ...studioTools };

    // Only add external tools for explicitly selected data sources
    if (dataSources && dataSources.length > 0) {
      const selectedSources = new Set(dataSources as string[]);

      // Google services - only if explicitly selected
      if (selectedSources.has("google_sheets") || selectedSources.has("google_drive") ||
          selectedSources.has("google_calendar") || selectedSources.has("google_gmail")) {
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
    }
    // If no data sources selected, only use studioTools (no external data access)

    // Build dynamic system prompt based on selected data sources
    const systemPrompt = buildSystemPrompt(dataSources);

    console.log(`[Chat API] Selected data sources:`, dataSources);
    console.log(`[Chat API] Available tools:`, Object.keys(filteredTools));

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

        // Add tool results as a separate tool message
        const toolResultParts = m.toolCalls
          .filter((tc) => tc.result !== undefined)
          .map((tc) => ({
            type: "tool-result",
            toolCallId: tc.id,
            toolName: tc.name,
            output: { type: "text", value: JSON.stringify(tc.result) },
          }));
        if (toolResultParts.length > 0) {
          processedMessages.push({ role: "tool", content: toolResultParts });
        }
      } else {
        processedMessages.push({
          role: m.role as "user" | "assistant",
          content: isLastUserMessage ? buildMessageContent(m.content, files) : m.content,
        });
      }
    }

    // Track token usage across all steps
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    const modelName = (model || defaultModel) as ModelId;

    // Auto compact: check if conversation needs compaction
    let compactInfo: { compacted: boolean; originalCount: number; keptCount: number; summary?: string } | null = null;
    let messagesToSend = processedMessages;

    if (shouldCompact(processedMessages, modelName)) {
      console.log(`[Chat API] Conversation exceeds compact threshold, compacting...`);
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

    // Create streaming response with tool loop
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const MAX_STEPS = 15;
        const currentMessages = [...messagesToSend];
        let step = 0;

        // Send compact event if compaction occurred
        if (compactInfo) {
          const compactLine = `c:${JSON.stringify(compactInfo)}\n`;
          controller.enqueue(encoder.encode(compactLine));
        }

        while (step < MAX_STEPS) {
          step++;
          console.log(`[Chat API] Step ${step}`);

          const result = streamText({
            model: selectedModel,
            system: systemPrompt,
            messages: currentMessages,
            tools: filteredTools,
          });

          let hasToolCalls = false;
          const toolCalls: Array<{ toolCallId: string; toolName: string; args: unknown }> = [];
          const toolResults: Array<{ toolCallId: string; result: unknown }> = [];
          for await (const part of result.fullStream) {
            let line = "";

            switch (part.type) {
              case "text-delta":
                line = `0:${JSON.stringify(part.text)}\n`;
                break;
              case "tool-call":
                hasToolCalls = true;
                toolCalls.push({
                  toolCallId: part.toolCallId,
                  toolName: part.toolName,
                  args: part.input,
                });
                line = `9:${JSON.stringify({
                  toolCallId: part.toolCallId,
                  toolName: part.toolName,
                  args: part.input,
                })}\n`;
                break;
              case "tool-result":
                toolResults.push({
                  toolCallId: part.toolCallId,
                  result: part.output,
                });
                line = `a:${JSON.stringify({
                  toolCallId: part.toolCallId,
                  result: part.output,
                })}\n`;
                break;
              case "error":
                line = `e:${JSON.stringify({ error: String(part.error) })}\n`;
                break;
            }

            if (line) {
              controller.enqueue(encoder.encode(line));
            }
          }

          // Get token usage for this step
          try {
            const usage = await result.usage;
            if (usage) {
              totalInputTokens += usage.inputTokens || 0;
              totalOutputTokens += usage.outputTokens || 0;
              console.log(`[Chat API] Step ${step} usage:`, usage);
            }
          } catch (e) {
            console.error(`[Chat API] Failed to get usage:`, e);
          }

          // If no tool calls, we're done
          if (!hasToolCalls) {
            console.log(`[Chat API] No tool calls, finishing`);
            break;
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

          console.log(`[Chat API] Tool calls processed, continuing loop`);
        }

        // If we exhausted all steps and the last step had tool calls,
        // do one final call WITHOUT tools to force a text response
        if (step >= MAX_STEPS) {
          console.log(`[Chat API] Max steps reached, forcing final text response`);
          const finalResult = streamText({
            model: selectedModel,
            system: systemPrompt + "\n\n（你已用完所有工具呼叫次數，請根據已取得的資料回答使用者。如果資訊不完整，告知使用者你找到了什麼，以及還需要什麼。）",
            messages: currentMessages,
            tools: {}, // no tools = force text response
          });

          for await (const part of finalResult.fullStream) {
            if (part.type === "text-delta") {
              controller.enqueue(encoder.encode(`0:${JSON.stringify(part.text)}\n`));
            }
          }

          try {
            const usage = await finalResult.usage;
            if (usage) {
              totalInputTokens += usage.inputTokens || 0;
              totalOutputTokens += usage.outputTokens || 0;
            }
          } catch (e) {
            console.error(`[Chat API] Failed to get final usage:`, e);
          }
        }

        // Save token usage to database
        if (totalInputTokens > 0 || totalOutputTokens > 0) {
          try {
            await prisma.tokenUsage.create({
              data: {
                userId,
                conversationId: conversationId || null,
                model: modelName,
                inputTokens: totalInputTokens,
                outputTokens: totalOutputTokens,
                totalTokens: totalInputTokens + totalOutputTokens,
              },
            });
            console.log(`[Chat API] Token usage saved: input=${totalInputTokens}, output=${totalOutputTokens}`);
          } catch (e) {
            console.error(`[Chat API] Failed to save token usage:`, e);
          }
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
