import { describe, it, expect, vi, beforeEach } from "vitest";

const prismaMock = vi.hoisted(() => ({
  tool: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
  },
  toolCodeSnapshot: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import {
  applyCodeUpdate,
  listSnapshots,
  restoreSnapshot,
} from "./tool-snapshot";

function mockTx() {
  const tx = {
    tool: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    toolCodeSnapshot: {
      create: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  };
  prismaMock.$transaction.mockImplementation(
    async (fn: (tx: unknown) => Promise<unknown>) => fn(tx)
  );
  return tx;
}

describe("applyCodeUpdate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns updated=false when newCode equals current code (no DB writes)", async () => {
    prismaMock.tool.findUnique.mockResolvedValue({ code: "same" });

    const result = await applyCodeUpdate("t1", "same");

    expect(result.updated).toBe(false);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("snapshots old code and updates tool when newCode differs", async () => {
    prismaMock.tool.findUnique.mockResolvedValue({ code: "old" });
    prismaMock.toolCodeSnapshot.findMany.mockResolvedValue([]);
    const tx = mockTx();

    const result = await applyCodeUpdate("t1", "new", "change button");

    expect(result.updated).toBe(true);
    expect(tx.toolCodeSnapshot.create).toHaveBeenCalledWith({
      data: { toolId: "t1", code: "old", explanation: "change button" },
    });
    expect(tx.tool.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { code: "new" },
    });
  });

  it("stores null explanation when none provided", async () => {
    prismaMock.tool.findUnique.mockResolvedValue({ code: "old" });
    prismaMock.toolCodeSnapshot.findMany.mockResolvedValue([]);
    const tx = mockTx();

    await applyCodeUpdate("t1", "new");

    expect(tx.toolCodeSnapshot.create).toHaveBeenCalledWith({
      data: { toolId: "t1", code: "old", explanation: null },
    });
  });

  it("trims oldest snapshots outside the transaction as best-effort", async () => {
    prismaMock.tool.findUnique.mockResolvedValue({ code: "old" });
    prismaMock.toolCodeSnapshot.findMany.mockResolvedValue([
      { id: "s-oldest-1" },
      { id: "s-oldest-2" },
    ]);
    mockTx();

    await applyCodeUpdate("t1", "new");

    // Wait a microtask tick so the best-effort chain resolves
    await new Promise((r) => setTimeout(r, 0));

    expect(prismaMock.toolCodeSnapshot.findMany).toHaveBeenCalledWith({
      where: { toolId: "t1" },
      orderBy: { createdAt: "desc" },
      skip: 20,
      select: { id: true },
    });
    expect(prismaMock.toolCodeSnapshot.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["s-oldest-1", "s-oldest-2"] } },
    });
  });

  it("throws when tool does not exist", async () => {
    prismaMock.tool.findUnique.mockResolvedValue(null);
    await expect(applyCodeUpdate("missing", "x")).rejects.toThrow(/not found/i);
  });
});

describe("listSnapshots", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns up to 20 snapshots ordered by createdAt desc, without the code field", async () => {
    prismaMock.toolCodeSnapshot.findMany.mockResolvedValue([
      { id: "s1", explanation: "first", createdAt: new Date("2026-04-17") },
    ]);

    const result = await listSnapshots("t1");

    expect(prismaMock.toolCodeSnapshot.findMany).toHaveBeenCalledWith({
      where: { toolId: "t1" },
      orderBy: { createdAt: "desc" },
      select: { id: true, explanation: true, createdAt: true },
      take: 20,
    });
    expect(result).toEqual([
      { id: "s1", explanation: "first", createdAt: new Date("2026-04-17") },
    ]);
  });
});

describe("restoreSnapshot", () => {
  beforeEach(() => vi.clearAllMocks());

  it("snapshots current then restores the target", async () => {
    prismaMock.toolCodeSnapshot.findUnique.mockResolvedValue({
      id: "snap-target",
      toolId: "t1",
      code: "old-version",
      createdAt: new Date("2026-04-16"),
    });
    prismaMock.tool.findUnique.mockResolvedValue({ code: "current" });
    prismaMock.toolCodeSnapshot.findMany.mockResolvedValue([]);
    const tx = mockTx();
    prismaMock.tool.findUniqueOrThrow.mockResolvedValue({
      id: "t1",
      code: "old-version",
    });

    const result = await restoreSnapshot("t1", "snap-target");

    expect(tx.toolCodeSnapshot.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ toolId: "t1", code: "current" }),
    });
    expect(tx.tool.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { code: "old-version" },
    });
    expect(result).toEqual({ id: "t1", code: "old-version" });
  });

  it("throws when snapshot does not exist", async () => {
    prismaMock.toolCodeSnapshot.findUnique.mockResolvedValue(null);
    await expect(restoreSnapshot("t1", "missing")).rejects.toThrow(
      /not found/i
    );
  });

  it("throws when snapshot belongs to a different tool", async () => {
    prismaMock.toolCodeSnapshot.findUnique.mockResolvedValue({
      id: "snap-1",
      toolId: "other-tool",
      code: "x",
      createdAt: new Date(),
    });

    await expect(restoreSnapshot("t1", "snap-1")).rejects.toThrow(
      /not found/i
    );
  });
});
