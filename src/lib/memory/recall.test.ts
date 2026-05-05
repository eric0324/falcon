import { describe, it, expect, vi, beforeEach } from "vitest";

const prismaMock = vi.hoisted(() => ({
  $queryRawUnsafe: vi.fn(),
}));
const embedTextMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/knowledge/embedding", () => ({ embedText: embedTextMock }));

import { recallMemories } from "./recall";

describe("recallMemories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    embedTextMock.mockResolvedValue(new Array(1024).fill(0));
  });

  it("returns empty result when message is blank", async () => {
    const result = await recallMemories("   ", "u1");
    expect(result.memories).toEqual([]);
    expect(result.promptText).toBe("");
    expect(embedTextMock).not.toHaveBeenCalled();
  });

  it("returns empty result when no memories exist", async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([]);
    const result = await recallMemories("hi", "u1");
    expect(result.memories).toEqual([]);
    expect(result.promptText).toBe("");
  });

  it("filters out memories above distance threshold", async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { id: "m1", type: "RULE", title: "A", content: "use sheets", distance: 0.1 },
      { id: "m2", type: "FACT", title: "B", content: "is HR", distance: 0.8 }, // filtered (above 0.6)
    ]);

    const result = await recallMemories("query", "u1");

    expect(result.memories).toHaveLength(1);
    expect(result.memories[0].id).toBe("m1");
  });

  it("caps results at top-5", async () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      id: `m${i}`,
      type: "RULE",
      title: `t${i}`,
      content: `c${i}`,
      distance: 0.1 + i * 0.01,
    }));
    prismaMock.$queryRawUnsafe.mockResolvedValue(rows);

    const result = await recallMemories("query", "u1");

    expect(result.memories.length).toBe(5);
  });

  it("truncates when total chars exceed 2000", async () => {
    const longContent = "x".repeat(800);
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { id: "m1", type: "RULE", title: "A", content: longContent, distance: 0.1 },
      { id: "m2", type: "RULE", title: "B", content: longContent, distance: 0.15 },
      { id: "m3", type: "RULE", title: "C", content: longContent, distance: 0.2 }, // would push over 2000
    ]);

    const result = await recallMemories("query", "u1");

    expect(result.memories.map((m) => m.id)).toEqual(["m1", "m2"]);
  });

  it("formats prompt text with [type] prefix", async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { id: "m1", type: "RULE", title: "A", content: "use sheets", distance: 0.1 },
      {
        id: "m2",
        type: "CONTEXT",
        title: "B",
        content: "in HR",
        distance: 0.2,
      },
    ]);

    const { promptText } = await recallMemories("query", "u1");

    expect(promptText).toContain("Personal Memories");
    expect(promptText).toContain("- [rule] use sheets");
    expect(promptText).toContain("- [context] in HR");
  });

  it("scopes query to userId", async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([]);
    await recallMemories("query", "u1");
    const args = prismaMock.$queryRawUnsafe.mock.calls[0];
    expect(args[2]).toBe("u1"); // 3rd arg is userId
  });
});
