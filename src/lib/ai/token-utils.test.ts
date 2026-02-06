import { describe, it, expect } from "vitest";
import {
  estimateTokens,
  estimateMessagesTokens,
  MODEL_CONTEXT_LIMITS,
  shouldCompact,
} from "./token-utils";

describe("estimateTokens", () => {
  it("estimates English text at ~0.25 tokens per char", () => {
    const text = "Hello world"; // 11 chars → ~3 tokens
    const tokens = estimateTokens(text);
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBe(Math.ceil(11 * 0.25));
  });

  it("estimates CJK text at ~1 token per char", () => {
    const text = "你好世界"; // 4 CJK chars → 4 tokens
    const tokens = estimateTokens(text);
    expect(tokens).toBe(4);
  });

  it("handles mixed CJK and English text", () => {
    const text = "Hello你好"; // 5 English chars + 2 CJK chars
    const tokens = estimateTokens(text);
    const expected = Math.ceil(5 * 0.25) + 2; // 2 + 2 = 4
    expect(tokens).toBe(expected);
  });

  it("returns 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("handles whitespace and punctuation as English chars", () => {
    const text = "a b c!"; // 6 chars → ceil(1.5) = 2
    expect(estimateTokens(text)).toBe(Math.ceil(6 * 0.25));
  });
});

describe("estimateMessagesTokens", () => {
  it("sums tokens across all messages", () => {
    const messages = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there" },
    ];
    const total = estimateMessagesTokens(messages);
    // "Hello" = ceil(5*0.25)=2, "Hi there" = ceil(8*0.25)=2
    expect(total).toBe(estimateTokens("Hello") + estimateTokens("Hi there"));
  });

  it("returns 0 for empty messages array", () => {
    expect(estimateMessagesTokens([])).toBe(0);
  });

  it("handles messages with tool call content", () => {
    const messages = [
      { role: "user", content: "test" },
      {
        role: "assistant",
        content: [
          { type: "tool-call", toolCallId: "1", toolName: "test", input: { foo: "bar" } },
        ],
      },
    ];
    const total = estimateMessagesTokens(messages);
    // Should handle non-string content by serializing it
    expect(total).toBeGreaterThan(0);
  });
});

describe("MODEL_CONTEXT_LIMITS", () => {
  it("has limits for all known models", () => {
    expect(MODEL_CONTEXT_LIMITS["claude-sonnet"]).toBeDefined();
    expect(MODEL_CONTEXT_LIMITS["claude-haiku"]).toBeDefined();
    expect(MODEL_CONTEXT_LIMITS["gpt-4o"]).toBeDefined();
    expect(MODEL_CONTEXT_LIMITS["gpt-4o-mini"]).toBeDefined();
    expect(MODEL_CONTEXT_LIMITS["gemini-flash"]).toBeDefined();
    expect(MODEL_CONTEXT_LIMITS["gemini-pro"]).toBeDefined();
  });

  it("all limits are positive numbers", () => {
    for (const limit of Object.values(MODEL_CONTEXT_LIMITS)) {
      expect(limit).toBeGreaterThan(0);
    }
  });
});

describe("shouldCompact", () => {
  it("returns false when tokens are below 80% threshold", () => {
    const shortMessages = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi" },
    ];
    expect(shouldCompact(shortMessages, "claude-haiku")).toBe(false);
  });

  it("returns true when tokens exceed 80% threshold", () => {
    // Create a very long message that exceeds 80% of gpt-4o-mini's 128k limit
    // 128000 * 0.8 = 102400 tokens → need ~409600 English chars
    const longContent = "a".repeat(420000);
    const messages = [{ role: "user", content: longContent }];
    expect(shouldCompact(messages, "gpt-4o-mini")).toBe(true);
  });

  it("returns false for empty messages", () => {
    expect(shouldCompact([], "claude-haiku")).toBe(false);
  });

  it("respects different model limits", () => {
    // Gemini has much larger context (1M), same content should NOT trigger
    const content = "a".repeat(420000); // ~105k tokens, above gpt-4o 80% but below gemini 80%
    const messages = [{ role: "user", content: content }];
    expect(shouldCompact(messages, "gpt-4o")).toBe(true);
    expect(shouldCompact(messages, "gemini-flash")).toBe(false);
  });
});
