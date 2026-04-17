import { ModelId } from "./models";

/**
 * 各 model 的 context window 上限 (tokens)
 */
export const MODEL_CONTEXT_LIMITS: Record<ModelId, number> = {
  "claude-opus-47": 200_000,
  "claude-opus": 200_000,
  "claude-sonnet": 200_000,
  "claude-haiku": 200_000,
  "gpt-5-mini": 400_000,
  "gpt-5-nano": 400_000,
  "gemini-flash": 1_048_576,
  "gemini-pro": 1_048_576,
};

const COMPACT_THRESHOLD = 0.7;

// CJK Unicode ranges
const CJK_REGEX = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;

/**
 * 粗估文字的 token 數量。
 * CJK 字元約 1 token/字，其他字元（英文、JSON、code）約 0.4 token/字。
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;

  let tokens = 0;
  for (const char of text) {
    if (CJK_REGEX.test(char)) {
      tokens += 1;
    } else {
      tokens += 0.4;
    }
  }
  return Math.ceil(tokens);
}

/**
 * 估算整個 messages 陣列的 token 數量。
 */
export function estimateMessagesTokens(
  messages: Array<{ role: string; content: unknown }>
): number {
  let total = 0;
  for (const msg of messages) {
    const text =
      typeof msg.content === "string"
        ? msg.content
        : JSON.stringify(msg.content);
    total += estimateTokens(text);
  }
  return total;
}

/**
 * 判斷是否需要 compact。
 * 當估算 token 超過 model context window 的 70% 時回傳 true。
 * overhead 參數用來計入 system prompt 和 tool definitions 的 token 數。
 */
export function shouldCompact(
  messages: Array<{ role: string; content: unknown }>,
  modelId: ModelId,
  overhead: number = 0
): boolean {
  if (messages.length === 0) return false;

  const limit = MODEL_CONTEXT_LIMITS[modelId];
  const threshold = limit * COMPACT_THRESHOLD;
  const estimated = estimateMessagesTokens(messages) + overhead;

  return estimated >= threshold;
}

/**
 * 硬性截斷 messages，只保留最後 N 則，確保不超過 token 上限。
 * 用於 compact 後仍然太大的情況作為最後防線。
 */
export function trimMessagesToFit(
  messages: Array<{ role: string; content: unknown }>,
  modelId: ModelId,
  overhead: number = 0
): Array<{ role: string; content: unknown }> {
  const limit = MODEL_CONTEXT_LIMITS[modelId];
  const maxTokens = limit * 0.85; // 留 15% 給 output

  let trimmed = [...messages];
  while (trimmed.length > 1) {
    const estimated = estimateMessagesTokens(trimmed) + overhead;
    if (estimated <= maxTokens) break;
    // 從最前面移除，但保留至少最後一則
    trimmed = trimmed.slice(1);
    // If the new first message is a "tool" (tool-result), its matching
    // assistant (tool-call) was just removed — drop it too to keep the pair intact.
    while (trimmed.length > 1 && trimmed[0]?.role === "tool") {
      trimmed = trimmed.slice(1);
    }
  }

  return trimmed;
}
