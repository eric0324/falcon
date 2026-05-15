import type { Message } from "@/types/message";
import { estimateTokens } from "./token-utils";

export interface TruncateHistoryOptions {
  /** Number of trailing user-message turns to keep with raw tool results. */
  keepRecentTurns: number;
  /** Per-result token budget; oversized results are truncated to fit. */
  maxResultTokens: number;
}

export interface TruncateHistoryStats {
  /** Number of tool-result payloads that were truncated. */
  truncatedCount: number;
  /** Estimated tokens removed by truncation. */
  tokensSaved: number;
}

/**
 * Truncate large `tool-result` payloads from older turns before sending the
 * conversation to the LLM. Recent turns (`keepRecentTurns` last user messages
 * onward) are returned byte-identical so the model can still cite raw data
 * from immediate context.
 *
 * Truncation is non-destructive: the input array and message objects are not
 * mutated. Only `toolCalls[].result` in older assistant messages may be
 * replaced with a marker string.
 */
export function truncateHistoricalToolResults(
  messages: Message[],
  options: TruncateHistoryOptions
): Message[] {
  return truncateHistoricalToolResultsWithStats(messages, options).messages;
}

export function truncateHistoricalToolResultsWithStats(
  messages: Message[],
  options: TruncateHistoryOptions
): { messages: Message[]; stats: TruncateHistoryStats } {
  const { keepRecentTurns, maxResultTokens } = options;
  const stats: TruncateHistoryStats = { truncatedCount: 0, tokensSaved: 0 };

  // Walk from the end and collect the last `keepRecentTurns` user message indices.
  const userIndices: number[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      userIndices.push(i);
      if (userIndices.length === keepRecentTurns) break;
    }
  }

  // Not enough user turns to be "historical" — return the input as-is.
  if (userIndices.length < keepRecentTurns) {
    return { messages: messages.slice(), stats };
  }

  // The oldest entry in `userIndices` is the boundary: index >= this is preserved.
  const keepFromIndex = userIndices[userIndices.length - 1];

  // Conservative char budget. estimateTokens uses 1 token/char for CJK and
  // 0.4 token/char otherwise; using 2.5x for the budget produces ~1000 tokens
  // for typical JSON/English content. CJK-heavy results may end up slightly
  // larger than the nominal cap, which is acceptable (errs on the safe side
  // of keeping data) for the first version.
  const charBudget = Math.floor(maxResultTokens * 2.5);

  const out = messages.map((msg, i) => {
    if (i >= keepFromIndex) return msg;
    if (msg.role !== "assistant" || !msg.toolCalls || msg.toolCalls.length === 0) {
      return msg;
    }

    const newToolCalls = msg.toolCalls.map((tc) => {
      if (tc.result === undefined) return tc;
      const serialized = JSON.stringify(tc.result);
      const totalTokens = estimateTokens(serialized);
      if (totalTokens <= maxResultTokens) return tc;

      const kept = serialized.slice(0, charBudget);
      const keptTokens = estimateTokens(kept);
      const truncated =
        `[TRUNCATED]\n${kept}\n[truncated: kept first ~${keptTokens} tokens of ${totalTokens} total]`;

      stats.truncatedCount += 1;
      stats.tokensSaved += totalTokens - keptTokens;

      return { ...tc, result: truncated };
    });

    return { ...msg, toolCalls: newToolCalls };
  });

  return { messages: out, stats };
}
