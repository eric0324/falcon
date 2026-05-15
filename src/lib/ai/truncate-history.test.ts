import { describe, it, expect } from "vitest";
import { truncateHistoricalToolResults } from "./truncate-history";
import type { Message } from "@/types/message";

function userMsg(text: string): Message {
  return { role: "user", content: text };
}

function assistantWithToolCall(text: string, result: unknown): Message {
  return {
    role: "assistant",
    content: text,
    toolCalls: [
      {
        id: `tc-${Math.random().toString(36).slice(2, 8)}`,
        name: "demo_tool",
        args: {},
        status: "completed",
        result,
      },
    ],
  };
}

function plainAssistant(text: string): Message {
  return { role: "assistant", content: text };
}

// ~5000-char string → estimateTokens ≈ 2000 tokens (English/JSON, ratio 0.4)
function bigJsonResult(charCount = 5000): unknown {
  // Build a realistic-ish array of records that JSON.stringify produces ~charCount chars
  const items: Array<{ id: number; text: string }> = [];
  let approxLen = 0;
  let i = 0;
  while (approxLen < charCount) {
    const item = { id: i, text: "lorem ipsum dolor sit amet ".repeat(3) };
    items.push(item);
    approxLen = JSON.stringify(items).length;
    i++;
  }
  return { rows: items, total: items.length };
}

const OPTS = { keepRecentTurns: 2, maxResultTokens: 1000 };

describe("truncateHistoricalToolResults", () => {
  it("returns the messages unchanged when conversation has only 1 user message", () => {
    const messages: Message[] = [
      userMsg("hi"),
      assistantWithToolCall("looked up", bigJsonResult()),
    ];
    const out = truncateHistoricalToolResults(messages, OPTS);
    expect(out).toEqual(messages);
  });

  it("returns the messages unchanged when conversation has exactly 2 user messages", () => {
    const big = bigJsonResult();
    const messages: Message[] = [
      userMsg("u1"),
      assistantWithToolCall("a1", big),
      userMsg("u2"),
      assistantWithToolCall("a2", big),
    ];
    const out = truncateHistoricalToolResults(messages, OPTS);
    // Both assistant tool results stay byte-identical
    expect(out[1].toolCalls?.[0].result).toBe(big);
    expect(out[3].toolCalls?.[0].result).toBe(big);
  });

  it("truncates only the oldest assistant tool result when there are 3+ user messages", () => {
    const old = bigJsonResult();
    const mid = bigJsonResult();
    const recent = bigJsonResult();
    const messages: Message[] = [
      userMsg("u1"),
      assistantWithToolCall("a1", old),    // older than keep-window → should be truncated
      userMsg("u2"),
      assistantWithToolCall("a2", mid),    // inside keep-window (turn -2) → preserved
      userMsg("u3"),
      assistantWithToolCall("a3", recent), // inside keep-window (turn -1) → preserved
    ];
    const out = truncateHistoricalToolResults(messages, OPTS);

    // Oldest result was truncated
    expect(out[1].toolCalls?.[0].result).not.toBe(old);
    expect(typeof out[1].toolCalls?.[0].result).toBe("string");

    // Recent two are untouched (reference equality OK because we don't deep-clone preserved messages)
    expect(out[3].toolCalls?.[0].result).toBe(mid);
    expect(out[5].toolCalls?.[0].result).toBe(recent);
  });

  it("leaves small tool results untouched even in the older section", () => {
    const tinyResult = { count: 3, names: ["a", "b", "c"] };
    const messages: Message[] = [
      userMsg("u1"),
      assistantWithToolCall("a1", tinyResult), // small + old → still NOT truncated
      userMsg("u2"),
      assistantWithToolCall("a2", bigJsonResult()),
      userMsg("u3"),
      assistantWithToolCall("a3", bigJsonResult()),
    ];
    const out = truncateHistoricalToolResults(messages, OPTS);
    expect(out[1].toolCalls?.[0].result).toBe(tinyResult);
  });

  it("truncated result is a string with [TRUNCATED] prefix and [truncated: ...] suffix", () => {
    const messages: Message[] = [
      userMsg("u1"),
      assistantWithToolCall("a1", bigJsonResult(8000)),
      userMsg("u2"),
      assistantWithToolCall("a2", "small"),
      userMsg("u3"),
      assistantWithToolCall("a3", "small"),
    ];
    const out = truncateHistoricalToolResults(messages, OPTS);
    const truncated = out[1].toolCalls?.[0].result;
    expect(typeof truncated).toBe("string");
    const s = truncated as string;
    expect(s.startsWith("[TRUNCATED]")).toBe(true);
    expect(s).toMatch(/\[truncated: kept first ~\d+ tokens of \d+ total\]\s*$/);
  });

  it("does not mutate the input array or message objects", () => {
    const messages: Message[] = [
      userMsg("u1"),
      assistantWithToolCall("a1", bigJsonResult()),
      userMsg("u2"),
      assistantWithToolCall("a2", "small"),
      userMsg("u3"),
      assistantWithToolCall("a3", "small"),
    ];
    const inputSnapshot = JSON.parse(JSON.stringify(messages));
    truncateHistoricalToolResults(messages, OPTS);
    expect(messages).toEqual(inputSnapshot);
  });

  it("passes through assistant messages without toolCalls (older section)", () => {
    const old = plainAssistant("just text, no tool call");
    const messages: Message[] = [
      userMsg("u1"),
      old, // older + no toolCalls → unchanged
      userMsg("u2"),
      assistantWithToolCall("a2", "small"),
      userMsg("u3"),
      assistantWithToolCall("a3", "small"),
    ];
    const out = truncateHistoricalToolResults(messages, OPTS);
    expect(out[1]).toBe(old);
  });

  it("does not modify user messages or assistant text content (only result is touched)", () => {
    const messages: Message[] = [
      userMsg("u1-long".repeat(2000)), // huge user text — must NOT be truncated
      {
        role: "assistant",
        content: "I will look this up.",
        toolCalls: [
          {
            id: "tc-1",
            name: "demo",
            args: {},
            status: "completed",
            result: bigJsonResult(),
          },
        ],
      },
      userMsg("u2"),
      assistantWithToolCall("a2", "small"),
      userMsg("u3"),
      assistantWithToolCall("a3", "small"),
    ];
    const out = truncateHistoricalToolResults(messages, OPTS);
    // User text is preserved verbatim
    expect(out[0].content).toBe(messages[0].content);
    // Assistant text is preserved verbatim
    expect(out[1].content).toBe("I will look this up.");
    // Only the result inside toolCalls was rewritten
    expect(typeof out[1].toolCalls?.[0].result).toBe("string");
  });

  it("handles multiple tool calls on a single older assistant message", () => {
    const a1Multi: Message = {
      role: "assistant",
      content: "looking up two things",
      toolCalls: [
        { id: "x1", name: "t1", args: {}, status: "completed", result: bigJsonResult() },
        { id: "x2", name: "t2", args: {}, status: "completed", result: "tiny" },
      ],
    };
    const messages: Message[] = [
      userMsg("u1"),
      a1Multi,
      userMsg("u2"),
      assistantWithToolCall("a2", "small"),
      userMsg("u3"),
      assistantWithToolCall("a3", "small"),
    ];
    const out = truncateHistoricalToolResults(messages, OPTS);
    // First (big) tool call is truncated; second (tiny) is preserved
    expect(typeof out[1].toolCalls?.[0].result).toBe("string");
    expect((out[1].toolCalls?.[0].result as string).startsWith("[TRUNCATED]")).toBe(true);
    expect(out[1].toolCalls?.[1].result).toBe("tiny");
  });
});
