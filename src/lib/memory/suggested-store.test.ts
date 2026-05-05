import { describe, it, expect, vi, beforeEach } from "vitest";

const prismaMock = vi.hoisted(() => ({
  suggestedMemory: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
}));
const createMemoryMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("./store", () => ({ createMemory: createMemoryMock }));

import {
  createSuggestedMemory,
  listPendingSuggested,
  acceptSuggested,
  dismissSuggested,
} from "./suggested-store";

describe("createSuggestedMemory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates with PENDING status", async () => {
    prismaMock.suggestedMemory.create.mockResolvedValue({ id: "s1" });
    await createSuggestedMemory("u1", {
      type: "CONTEXT",
      title: "hi",
      content: "abc",
      conversationId: "c1",
    });
    expect(prismaMock.suggestedMemory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PENDING", conversationId: "c1" }),
      })
    );
  });
});

describe("listPendingSuggested", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filters by user + PENDING status", async () => {
    prismaMock.suggestedMemory.findMany.mockResolvedValue([]);
    await listPendingSuggested("u1");
    expect(prismaMock.suggestedMemory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "u1", status: "PENDING" },
      })
    );
  });

  it("scopes by conversationId when provided", async () => {
    prismaMock.suggestedMemory.findMany.mockResolvedValue([]);
    await listPendingSuggested("u1", "c1");
    const where = prismaMock.suggestedMemory.findMany.mock.calls[0][0].where;
    expect(where.conversationId).toBe("c1");
  });
});

describe("acceptSuggested", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates Memory + marks ACCEPTED", async () => {
    prismaMock.suggestedMemory.findFirst.mockResolvedValue({
      id: "s1",
      type: "RULE",
      title: "T",
      content: "C",
    });
    createMemoryMock.mockResolvedValue({ id: "m1" });
    prismaMock.suggestedMemory.update.mockResolvedValue({ id: "s1" });

    const memory = await acceptSuggested("s1", "u1");

    expect(memory?.id).toBe("m1");
    expect(createMemoryMock).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ source: "SUGGESTED", confidence: "MEDIUM" })
    );
    expect(prismaMock.suggestedMemory.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { status: "ACCEPTED", acceptedMemoryId: "m1" },
    });
  });

  it("returns null if not pending or not owned", async () => {
    prismaMock.suggestedMemory.findFirst.mockResolvedValue(null);
    const result = await acceptSuggested("s1", "u1");
    expect(result).toBeNull();
    expect(createMemoryMock).not.toHaveBeenCalled();
  });
});

describe("dismissSuggested", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks DISMISSED only when pending and owned", async () => {
    prismaMock.suggestedMemory.updateMany.mockResolvedValue({ count: 1 });
    expect(await dismissSuggested("s1", "u1")).toBe(true);
    expect(prismaMock.suggestedMemory.updateMany).toHaveBeenCalledWith({
      where: { id: "s1", userId: "u1", status: "PENDING" },
      data: { status: "DISMISSED" },
    });
  });

  it("returns false when nothing matches", async () => {
    prismaMock.suggestedMemory.updateMany.mockResolvedValue({ count: 0 });
    expect(await dismissSuggested("s1", "u1")).toBe(false);
  });
});
