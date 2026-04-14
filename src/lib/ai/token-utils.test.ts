import { describe, it, expect } from "vitest";
import {
  estimateTokens,
  estimateMessagesTokens,
  MODEL_CONTEXT_LIMITS,
  shouldCompact,
} from "./token-utils";

describe("estimateTokens", () => {
  it("estimates English text at ~0.4 tokens per char", () => {
    const text = "Hello world"; // 11 chars → ceil(4.4) = 5
    const tokens = estimateTokens(text);
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBe(Math.ceil(11 * 0.4));
  });

  it("estimates CJK text at ~1 token per char", () => {
    const text = "你好世界"; // 4 CJK chars → 4 tokens
    const tokens = estimateTokens(text);
    expect(tokens).toBe(4);
  });

  it("handles mixed CJK and English text", () => {
    const text = "Hello你好"; // 5 English chars + 2 CJK chars
    const tokens = estimateTokens(text);
    const expected = Math.ceil(5 * 0.4 + 2); // ceil(4) = 4
    expect(tokens).toBe(expected);
  });

  it("returns 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("handles whitespace and punctuation as non-CJK chars", () => {
    const text = "a b c!"; // 6 chars → ceil(2.4) = 3
    expect(estimateTokens(text)).toBe(Math.ceil(6 * 0.4));
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
    expect(MODEL_CONTEXT_LIMITS["gpt-5-mini"]).toBeDefined();
    expect(MODEL_CONTEXT_LIMITS["gpt-5-nano"]).toBeDefined();
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
    // Create a very long message that exceeds 80% of claude-haiku's 200k limit
    // 200000 * 0.8 = 160000 tokens → need ~640000 English chars
    const longContent = "a".repeat(650000);
    const messages = [{ role: "user", content: longContent }];
    expect(shouldCompact(messages, "claude-haiku")).toBe(true);
  });

  it("returns false for empty messages", () => {
    expect(shouldCompact([], "claude-haiku")).toBe(false);
  });

  it("respects different model limits", () => {
    // Gemini has much larger context (1M), same content should NOT trigger
    const content = "a".repeat(650000); // ~162k tokens, above claude 80% but below gemini 80%
    const messages = [{ role: "user", content: content }];
    expect(shouldCompact(messages, "claude-haiku")).toBe(true);
    expect(shouldCompact(messages, "gemini-flash")).toBe(false);
  });
});
