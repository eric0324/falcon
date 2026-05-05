import { describe, it, expect, vi, beforeEach } from "vitest";

const generateTextMock = vi.hoisted(() => vi.fn());
const getModelMock = vi.hoisted(() => vi.fn());
const embedTextMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  $queryRawUnsafe: vi.fn(),
}));

vi.mock("ai", () => ({ generateText: generateTextMock }));
vi.mock("@/lib/ai/models", () => ({ getModel: getModelMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/knowledge/embedding", () => ({ embedText: embedTextMock }));

import { extractPassive } from "./extract-passive";

describe("extractPassive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getModelMock.mockResolvedValue({});
    embedTextMock.mockResolvedValue(new Array(1024).fill(0));
    prismaMock.$queryRawUnsafe.mockResolvedValue([]); // no dedupe matches by default
  });

  it("returns empty when no recent messages", async () => {
    const result = await extractPassive([], "u1");
    expect(result).toEqual([]);
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("parses valid candidates from LLM JSON", async () => {
    generateTextMock.mockResolvedValue({
      text: `{"candidates":[
        {"type":"CONTEXT","title":"HR","content":"使用者在 HR 部門"},
        {"type":"RULE","title":"Sheets","content":"以後都用 Google Sheets"}
      ]}`,
    });

    const result = await extractPassive(
      [
        { role: "user", content: "我在 HR 部門做工具" },
        { role: "assistant", content: "好的" },
      ],
      "u1"
    );

    expect(result).toHaveLength(2);
    expect(result[0].type).toBe("CONTEXT");
    expect(result[1].type).toBe("RULE");
  });

  it("returns empty when LLM returns no candidates", async () => {
    generateTextMock.mockResolvedValue({ text: '{"candidates":[]}' });
    const result = await extractPassive(
      [{ role: "user", content: "hi" }],
      "u1"
    );
    expect(result).toEqual([]);
  });

  it("filters out invalid type or missing fields", async () => {
    generateTextMock.mockResolvedValue({
      text: `{"candidates":[
        {"type":"NOPE","title":"x","content":"y"},
        {"type":"FACT","title":"valid","content":"valid content"},
        {"type":"PREFERENCE","title":""}
      ]}`,
    });

    const result = await extractPassive(
      [{ role: "user", content: "hi" }],
      "u1"
    );

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("FACT");
  });

  it("caps candidates at 3", async () => {
    const items = Array.from({ length: 5 }, (_, i) => ({
      type: "FACT",
      title: `t${i}`,
      content: `content ${i}`,
    }));
    generateTextMock.mockResolvedValue({
      text: JSON.stringify({ candidates: items }),
    });

    const result = await extractPassive(
      [{ role: "user", content: "hi" }],
      "u1"
    );

    expect(result.length).toBe(3);
  });

  it("dedupes against existing Memory", async () => {
    generateTextMock.mockResolvedValue({
      text: '{"candidates":[{"type":"FACT","title":"t","content":"c"}]}',
    });
    prismaMock.$queryRawUnsafe.mockResolvedValue([{ id: "existing-m" }]);

    const result = await extractPassive(
      [{ role: "user", content: "hi" }],
      "u1"
    );

    expect(result).toEqual([]);
  });

  it("returns empty when LLM throws", async () => {
    generateTextMock.mockRejectedValue(new Error("api down"));
    const result = await extractPassive(
      [{ role: "user", content: "hi" }],
      "u1"
    );
    expect(result).toEqual([]);
  });

  it("uses last 6 messages only", async () => {
    generateTextMock.mockResolvedValue({ text: '{"candidates":[]}' });
    const messages = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content: `msg ${i}`,
    }));

    await extractPassive(messages, "u1");

    const promptArg = generateTextMock.mock.calls[0][0].prompt;
    // Should contain msg 4-9 (last 6)
    expect(promptArg).not.toContain("msg 0");
    expect(promptArg).toContain("msg 9");
    expect(promptArg).toContain("msg 4");
  });
});
