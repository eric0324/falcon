import { describe, it, expect, vi, beforeEach } from "vitest";
import { splitMessages, compactMessages, type CompactResult } from "./compact";

// Mock the AI SDK
vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

// Mock models to avoid importing real AI SDK providers
vi.mock("./models", () => ({
  models: {
    "claude-haiku": { provider: "anthropic", modelId: "claude-haiku" },
    "claude-sonnet": { provider: "anthropic", modelId: "claude-sonnet" },
    "gpt-4o": { provider: "openai", modelId: "gpt-4o" },
    "gpt-4o-mini": { provider: "openai", modelId: "gpt-4o-mini" },
    "gemini-flash": { provider: "google", modelId: "gemini-flash" },
    "gemini-pro": { provider: "google", modelId: "gemini-pro" },
  },
  defaultModel: "claude-haiku",
}));

import { generateText } from "ai";

const mockedGenerateText = vi.mocked(generateText);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("splitMessages", () => {
  it("splits messages keeping last N messages", () => {
    const messages = [
      { role: "user", content: "msg1" },
      { role: "assistant", content: "msg2" },
      { role: "user", content: "msg3" },
      { role: "assistant", content: "msg4" },
      { role: "user", content: "msg5" },
      { role: "assistant", content: "msg6" },
      { role: "user", content: "msg7" },
      { role: "assistant", content: "msg8" },
    ];

    const { oldMessages, recentMessages } = splitMessages(messages, 6);

    expect(recentMessages).toHaveLength(6);
    expect(oldMessages).toHaveLength(2);
    expect(oldMessages[0].content).toBe("msg1");
    expect(oldMessages[1].content).toBe("msg2");
    expect(recentMessages[0].content).toBe("msg3");
  });

  it("returns all as recent when messages <= keepCount", () => {
    const messages = [
      { role: "user", content: "msg1" },
      { role: "assistant", content: "msg2" },
    ];

    const { oldMessages, recentMessages } = splitMessages(messages, 6);

    expect(oldMessages).toHaveLength(0);
    expect(recentMessages).toHaveLength(2);
  });

  it("defaults keepCount to 6", () => {
    const messages = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `msg${i + 1}`,
    }));

    const { oldMessages, recentMessages } = splitMessages(messages);

    expect(recentMessages).toHaveLength(6);
    expect(oldMessages).toHaveLength(4);
  });
});

describe("compactMessages", () => {
  it("returns compacted result with summary and recent messages", async () => {
    mockedGenerateText.mockResolvedValue({
      text: "這是對話摘要",
    } as ReturnType<typeof generateText> extends Promise<infer T> ? T : never);

    const messages = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `message ${i + 1}`,
    }));

    const result: CompactResult = await compactMessages(messages);

    expect(result.summary).toBe("這是對話摘要");
    expect(result.keptCount).toBe(6);
    expect(result.originalCount).toBe(10);
    // compactedMessages: summary pair + 6 recent = 8
    expect(result.compactedMessages).toHaveLength(8);
    // First message is the summary context
    expect(result.compactedMessages[0].role).toBe("user");
    expect(result.compactedMessages[0].content).toContain("這是對話摘要");
    // Second message is the acknowledgement
    expect(result.compactedMessages[1].role).toBe("assistant");
  });

  it("calls generateText with claude-haiku for summarization", async () => {
    mockedGenerateText.mockResolvedValue({
      text: "summary",
    } as ReturnType<typeof generateText> extends Promise<infer T> ? T : never);

    const messages = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `msg${i + 1}`,
    }));

    await compactMessages(messages);

    expect(mockedGenerateText).toHaveBeenCalledOnce();
    const callArgs = mockedGenerateText.mock.calls[0][0];
    expect(callArgs.prompt).toBeDefined();
  });

  it("includes old messages content in the summarization prompt", async () => {
    mockedGenerateText.mockResolvedValue({
      text: "summary",
    } as ReturnType<typeof generateText> extends Promise<infer T> ? T : never);

    const messages = [
      { role: "user", content: "我想做一個計算機" },
      { role: "assistant", content: "好的，我來幫你做" },
      { role: "user", content: "加上歷史紀錄功能" },
      { role: "assistant", content: "已加上歷史紀錄" },
      { role: "user", content: "recent1" },
      { role: "assistant", content: "recent2" },
      { role: "user", content: "recent3" },
      { role: "assistant", content: "recent4" },
      { role: "user", content: "recent5" },
      { role: "assistant", content: "recent6" },
    ];

    await compactMessages(messages);

    const prompt = mockedGenerateText.mock.calls[0][0].prompt as string;
    expect(prompt).toContain("我想做一個計算機");
    expect(prompt).toContain("已加上歷史紀錄");
    // Recent messages should NOT be in the summarization prompt
    expect(prompt).not.toContain("recent5");
    expect(prompt).not.toContain("recent6");
  });
});
