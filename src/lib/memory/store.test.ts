import { describe, it, expect, vi, beforeEach } from "vitest";

const prismaMock = vi.hoisted(() => ({
  memory: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  $executeRawUnsafe: vi.fn(),
}));
const embedMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("./embed", () => ({ embedAndStoreMemory: embedMock }));

import {
  createMemory,
  listMemoriesByUser,
  updateMemory,
  deleteMemory,
  countUserMemories,
} from "./store";

describe("createMemory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("inserts memory and triggers embedding", async () => {
    prismaMock.memory.create.mockResolvedValue({
      id: "m1",
      userId: "u1",
      content: "ABC",
    });
    embedMock.mockResolvedValue(undefined);

    const result = await createMemory("u1", {
      type: "RULE",
      title: "test",
      content: "ABC",
      source: "EXPLICIT",
      confidence: "HIGH",
    });

    expect(prismaMock.memory.create).toHaveBeenCalled();
    expect(embedMock).toHaveBeenCalledWith("m1", "ABC");
    expect(result.id).toBe("m1");
  });

  it("truncates title to 120 chars", async () => {
    prismaMock.memory.create.mockResolvedValue({ id: "m2" });

    const longTitle = "a".repeat(200);
    await createMemory("u1", {
      type: "FACT",
      title: longTitle,
      content: "x",
      source: "EXPLICIT",
      confidence: "HIGH",
    });

    const callArg = prismaMock.memory.create.mock.calls[0][0];
    expect(callArg.data.title.length).toBe(120);
  });
});

describe("updateMemory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null if memory not owned by user", async () => {
    prismaMock.memory.findFirst.mockResolvedValue(null);
    const result = await updateMemory("m1", "u1", { content: "new" });
    expect(result).toBeNull();
    expect(prismaMock.memory.update).not.toHaveBeenCalled();
  });

  it("re-embeds when content changes", async () => {
    prismaMock.memory.findFirst.mockResolvedValue({
      id: "m1",
      content: "old",
    });
    prismaMock.memory.update.mockResolvedValue({ id: "m1", content: "new" });

    await updateMemory("m1", "u1", { content: "new" });

    expect(embedMock).toHaveBeenCalledWith("m1", "new");
  });

  it("does not re-embed when content unchanged", async () => {
    prismaMock.memory.findFirst.mockResolvedValue({
      id: "m1",
      content: "same",
    });
    prismaMock.memory.update.mockResolvedValue({ id: "m1" });

    await updateMemory("m1", "u1", { title: "new title" });

    expect(embedMock).not.toHaveBeenCalled();
  });
});

describe("deleteMemory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns true when row deleted", async () => {
    prismaMock.memory.deleteMany.mockResolvedValue({ count: 1 });
    expect(await deleteMemory("m1", "u1")).toBe(true);
  });

  it("returns false when nothing matches user", async () => {
    prismaMock.memory.deleteMany.mockResolvedValue({ count: 0 });
    expect(await deleteMemory("m1", "u1")).toBe(false);
  });

  it("scopes deletion to owning user", async () => {
    prismaMock.memory.deleteMany.mockResolvedValue({ count: 1 });
    await deleteMemory("m1", "u1");
    expect(prismaMock.memory.deleteMany).toHaveBeenCalledWith({
      where: { id: "m1", userId: "u1" },
    });
  });
});

describe("listMemoriesByUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filters by userId and orders desc", async () => {
    prismaMock.memory.findMany.mockResolvedValue([]);
    await listMemoriesByUser("u1");
    expect(prismaMock.memory.findMany).toHaveBeenCalledWith({
      where: { userId: "u1" },
      orderBy: { createdAt: "desc" },
    });
  });
});

describe("countUserMemories", () => {
  beforeEach(() => vi.clearAllMocks());

  it("counts only matching userId", async () => {
    prismaMock.memory.count.mockResolvedValue(3);
    const n = await countUserMemories("u1");
    expect(n).toBe(3);
    expect(prismaMock.memory.count).toHaveBeenCalledWith({
      where: { userId: "u1" },
    });
  });
});
