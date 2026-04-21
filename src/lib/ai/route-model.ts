import type { ModelId } from "./models";

export interface RouteModelInput {
  userMessage: string;
  selectedModel: ModelId;
  hasFiles: boolean;
  hasToolHistory: boolean;
}

/** Anthropic high-tier models eligible for auto-downgrade to Haiku. */
const HIGH_TIER: ReadonlySet<ModelId> = new Set<ModelId>([
  "claude-opus-47",
  "claude-opus",
  "claude-sonnet",
]);

/** Messages shorter than this are candidates for downgrade. */
const SHORT_MESSAGE_CHARS = 200;

/**
 * Signals that the user wants Opus-level reasoning / generation.
 * Detected case-insensitively via substring match.
 * Skews toward keeping the selected model (false negatives preferred over false positives).
 */
const UPGRADE_KEYWORDS: readonly string[] = [
  // Chinese — code / build
  "寫", "改", "程式", "程式碼", "重構", "重寫", "重做", "建立", "實作",
  "做個", "做一個", "幫我寫", "幫我改", "幫我做",
  // Chinese — analysis / reporting / design
  "分析", "報告", "設計", "比較", "評估", "總結", "摘要",
  // Chinese — image
  "畫", "畫圖", "生成圖", "圖片生成",
  // English — code / build
  "code", "build", "create", "make", "fix", "refactor", "implement", "write",
  // English — analysis / reporting / design
  "analyze", "analyse", "report", "compare", "design", "evaluate", "summarize",
];

function containsUpgradeKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return UPGRADE_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
}

/**
 * Decide the actual model to use for a chat turn.
 *
 * Returns `claude-haiku` when all downgrade conditions match on a high-tier
 * Anthropic model; otherwise returns the user-selected model unchanged.
 * Non-Anthropic models and haiku are passed through without routing.
 */
export function routeModel(input: RouteModelInput): ModelId {
  const { userMessage, selectedModel, hasFiles, hasToolHistory } = input;

  if (!HIGH_TIER.has(selectedModel)) return selectedModel;

  // Conservative: anything non-trivial keeps the selected model.
  if (!userMessage || userMessage.trim() === "") return selectedModel;
  if (userMessage.length >= SHORT_MESSAGE_CHARS) return selectedModel;
  if (hasFiles) return selectedModel;
  if (hasToolHistory) return selectedModel;
  if (containsUpgradeKeyword(userMessage)) return selectedModel;

  return "claude-haiku";
}
