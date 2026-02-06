import { ModelId } from "./models";

/**
 * 各 model 的 context window 上限 (tokens)
 */
export const MODEL_CONTEXT_LIMITS: Record<ModelId, number> = {
  "claude-sonnet": 200_000,
  "claude-haiku": 200_000,
  "gpt-4o": 128_000,
  "gpt-4o-mini": 128_000,
  "gemini-flash": 1_048_576,
  "gemini-pro": 1_048_576,
};

const COMPACT_THRESHOLD = 0.8;

// CJK Unicode ranges
const CJK_REGEX = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;

/**
 * 粗估文字的 token 數量。
 * CJK 字元約 1 token/字，其他字元約 0.25 token/字。
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;

  let tokens = 0;
  for (const char of text) {
    if (CJK_REGEX.test(char)) {
      tokens += 1;
    } else {
      tokens += 0.25;
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
 * 當估算 token 超過 model context window 的 80% 時回傳 true。
 */
export function shouldCompact(
  messages: Array<{ role: string; content: unknown }>,
  modelId: ModelId
): boolean {
  if (messages.length === 0) return false;

  const limit = MODEL_CONTEXT_LIMITS[modelId];
  const threshold = limit * COMPACT_THRESHOLD;
  const estimated = estimateMessagesTokens(messages);

  return estimated >= threshold;
}
