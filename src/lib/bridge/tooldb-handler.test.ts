import { describe, it, expect, vi, beforeEach } from "vitest";
import { normalizeRow } from "./tooldb-handler";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    toolTable: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    toolRow: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { handleToolDB } from "./tooldb-handler";

const mockTable = vi.mocked(prisma.toolTable);
const mockRow = vi.mocked(prisma.toolRow);

const TOOL_ID = "tool-1";
const USER_ID = "user-1";
const TABLE_ID = "table-1";
const ctx = { toolId: TOOL_ID, userId: USER_ID };

beforeEach(() => vi.clearAllMocks());

function makeTable(overrides = {}) {
  return { id: TABLE_ID, toolId: TOOL_ID, columns: [{ name: "A", type: "text" }], ...overrides };
}

describe("normalizeRow", () => {
  it("returns only schema columns", () => {
    expect(normalizeRow({ A: 1, B: 2, C: 3 }, [{ name: "A", type: "number" }, { name: "C", type: "number" }]))
      .toEqual({ A: 1, C: 3 });
  });

  it("fills null for missing columns", () => {
    expect(normalizeRow({ A: 1 }, [{ name: "A", type: "number" }, { name: "D", type: "text" }]))
      .toEqual({ A: 1, D: null });
  });

  it("omits deleted columns", () => {
    expect(normalizeRow({ A: 1, B: 2 }, [{ name: "A", type: "number" }]))
      .toEqual({ A: 1 });
  });
});

describe("createTable", () => {
  it("creates new table", async () => {
    mockTable.findUnique.mockResolvedValueOnce(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockTable.create.mockResolvedValueOnce(makeTable({ name: "test" }) as any);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await handleToolDB("createTable", { name: "test", columns: [{ name: "A", type: "text" }] }, ctx) as any;
    expect(result.table.name).toBe("test");
    expect(result.table.rowCount).toBe(0);
  });

  it("returns existing if same name", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockTable.findUnique.mockResolvedValueOnce(makeTable({ name: "test" }) as any);
    mockRow.count.mockResolvedValueOnce(5);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await handleToolDB("createTable", { name: "test", columns: [{ name: "A", type: "text" }] }, ctx) as any;
    expect(result.table.rowCount).toBe(5);
    expect(mockTable.create).not.toHaveBeenCalled();
  });
});

describe("insert", () => {
  it("rejects cross-tool access", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockTable.findUnique.mockResolvedValueOnce(makeTable({ toolId: "other" }) as any);
    await expect(handleToolDB("insert", { tableId: TABLE_ID, data: { A: 1 } }, ctx)).rejects.toThrow("無權存取");
  });

  it("rejects at row limit", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockTable.findUnique.mockResolvedValueOnce(makeTable() as any);
    mockRow.count.mockResolvedValueOnce(10_000);
    await expect(handleToolDB("insert", { tableId: TABLE_ID, data: { A: "x" } }, ctx)).rejects.toThrow("已達上限");
  });

  it("inserts and normalizes", async () => {
    const now = new Date();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockTable.findUnique.mockResolvedValueOnce(makeTable({ columns: [{ name: "A", type: "text" }, { name: "B", type: "number" }] }) as any);
    mockRow.count.mockResolvedValueOnce(0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockRow.create.mockResolvedValueOnce({ id: "r1", tableId: TABLE_ID, data: { A: "hi" }, createdBy: USER_ID, createdAt: now, updatedAt: now } as any);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await handleToolDB("insert", { tableId: TABLE_ID, data: { A: "hi" } }, ctx) as any;
    expect(result.row.data).toEqual({ A: "hi", B: null });
  });
});

describe("list", () => {
  it("normalizes, filters, sorts", async () => {
    const now = new Date();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockTable.findUnique.mockResolvedValueOnce(makeTable({ columns: [{ name: "name", type: "text" }, { name: "score", type: "number" }] }) as any);
    mockRow.findMany.mockResolvedValueOnce([
      { id: "r1", tableId: TABLE_ID, data: { name: "Alice", score: 90 }, createdBy: null, createdAt: now, updatedAt: now },
      { id: "r2", tableId: TABLE_ID, data: { name: "Bob", score: 80 }, createdBy: null, createdAt: now, updatedAt: now },
      { id: "r3", tableId: TABLE_ID, data: { name: "Alice", score: 70 }, createdBy: null, createdAt: now, updatedAt: now },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await handleToolDB("list", { tableId: TABLE_ID, filter: { name: "Alice" }, sort: { field: "score", order: "desc" } }, ctx) as any;
    expect(result.total).toBe(2);
    expect(result.rows[0].data.score).toBe(90);
    expect(result.rows[1].data.score).toBe(70);
  });
});

describe("update", () => {
  it("shallow merges", async () => {
    const now = new Date();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockTable.findUnique.mockResolvedValueOnce(makeTable({ columns: [{ name: "A", type: "text" }, { name: "B", type: "text" }] }) as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockRow.findUnique.mockResolvedValueOnce({ id: "r1", tableId: TABLE_ID, data: { A: "old", B: "keep" }, createdBy: USER_ID, createdAt: now, updatedAt: now } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockRow.update.mockResolvedValueOnce({ id: "r1", tableId: TABLE_ID, data: { A: "new", B: "keep" }, createdBy: USER_ID, createdAt: now, updatedAt: now } as any);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await handleToolDB("update", { tableId: TABLE_ID, rowId: "r1", data: { A: "new" } }, ctx) as any;
    expect(mockRow.update).toHaveBeenCalledWith({ where: { id: "r1" }, data: { data: { A: "new", B: "keep" } } });
    expect(result.row.data).toEqual({ A: "new", B: "keep" });
  });
});

describe("delete", () => {
  it("deletes row", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockTable.findUnique.mockResolvedValueOnce(makeTable() as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockRow.findUnique.mockResolvedValueOnce({ id: "r1", tableId: TABLE_ID } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockRow.delete.mockResolvedValueOnce({} as any);

    const result = await handleToolDB("delete", { tableId: TABLE_ID, rowId: "r1" }, ctx);
    expect(result).toEqual({ success: true });
  });

  it("rejects wrong table", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockTable.findUnique.mockResolvedValueOnce(makeTable() as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockRow.findUnique.mockResolvedValueOnce({ id: "r1", tableId: "other-table" } as any);
    await expect(handleToolDB("delete", { tableId: TABLE_ID, rowId: "r1" }, ctx)).rejects.toThrow("找不到此筆資料");
  });
});
