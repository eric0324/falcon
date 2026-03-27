/**
 * Tool Database handler — CRUD operations for tool-owned data tables.
 * Schema-on-read: columns define what to return, raw data is never migrated.
 */

import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Params = Record<string, any>;

export interface ColumnDef {
  name: string;
  type: "text" | "number" | "date" | "boolean" | "select";
  options?: string[];
}

const MAX_ROWS = 10_000;
const MAX_ROW_SIZE = 10_240; // 10KB
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * Normalize a row's data according to current column definitions.
 * Columns in schema → return value (or null). Deleted columns → omit.
 */
export function normalizeRow(
  data: Record<string, unknown>,
  columns: ColumnDef[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const col of columns) {
    result[col.name] = data[col.name] ?? null;
  }
  return result;
}

function matchesFilter(
  data: Record<string, unknown>,
  filter: Record<string, unknown>
): boolean {
  return Object.entries(filter).every(([key, value]) => data[key] === value);
}

async function getTableForTool(tableId: string, toolId: string) {
  const table = await prisma.toolTable.findUnique({ where: { id: tableId } });
  if (!table || table.toolId !== toolId) {
    throw new Error("無權存取此資料表");
  }
  return table;
}

function toRow(row: { id: string; data: unknown; createdBy: string | null; createdAt: Date; updatedAt: Date }, columns: ColumnDef[]) {
  return {
    id: row.id,
    data: normalizeRow(row.data as Record<string, unknown>, columns),
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function handleToolDB(
  action: string,
  params: Params,
  context: { toolId: string; userId: string }
): Promise<unknown> {
  const { toolId, userId } = context;

  switch (action) {
    // ===== Schema =====

    case "createTable": {
      const { name, columns } = params;
      if (!name || !columns) throw new Error("name and columns are required");

      const existing = await prisma.toolTable.findUnique({
        where: { toolId_name: { toolId, name } },
      });
      if (existing) {
        const rowCount = await prisma.toolRow.count({ where: { tableId: existing.id } });
        return { table: { id: existing.id, name: existing.name, columns: existing.columns, rowCount } };
      }

      const table = await prisma.toolTable.create({ data: { toolId, name, columns } });
      return { table: { id: table.id, name: table.name, columns: table.columns, rowCount: 0 } };
    }

    case "updateSchema": {
      const { tableId, columns } = params;
      if (!tableId || !columns) throw new Error("tableId and columns are required");
      await getTableForTool(tableId, toolId);

      const table = await prisma.toolTable.update({ where: { id: tableId }, data: { columns } });
      const rowCount = await prisma.toolRow.count({ where: { tableId } });
      return { table: { id: table.id, name: table.name, columns: table.columns, rowCount } };
    }

    case "deleteTable": {
      const { tableId } = params;
      if (!tableId) throw new Error("tableId is required");
      await getTableForTool(tableId, toolId);
      await prisma.toolTable.delete({ where: { id: tableId } });
      return { success: true };
    }

    case "listTables": {
      const tables = await prisma.toolTable.findMany({
        where: { toolId },
        include: { _count: { select: { rows: true } } },
        orderBy: { createdAt: "asc" },
      });
      return {
        tables: tables.map((t) => ({
          id: t.id, name: t.name, columns: t.columns, rowCount: t._count.rows,
        })),
      };
    }

    // ===== CRUD =====

    case "insert": {
      const { tableId, data } = params;
      if (!tableId || !data) throw new Error("tableId and data are required");
      const table = await getTableForTool(tableId, toolId);

      if (JSON.stringify(data).length > MAX_ROW_SIZE) {
        throw new Error(`單筆資料超過 ${MAX_ROW_SIZE / 1024}KB 上限`);
      }

      const count = await prisma.toolRow.count({ where: { tableId } });
      if (count >= MAX_ROWS) {
        throw new Error(`此資料表已達上限 ${MAX_ROWS.toLocaleString()} 筆`);
      }

      const row = await prisma.toolRow.create({ data: { tableId, data, createdBy: userId } });
      return { row: toRow(row, table.columns as unknown as ColumnDef[]) };
    }

    case "list": {
      const { tableId, filter, sort, limit, offset, mine } = params;
      if (!tableId) throw new Error("tableId is required");
      const table = await getTableForTool(tableId, toolId);
      const columns = table.columns as unknown as ColumnDef[];
      const effectiveLimit = Math.min(limit || DEFAULT_LIMIT, MAX_LIMIT);
      const effectiveOffset = offset || 0;

      const allRows = await prisma.toolRow.findMany({
        where: { tableId, ...(mine ? { createdBy: userId } : {}) },
        orderBy: { createdAt: "asc" },
      });

      let processed = allRows.map((r) => toRow(r, columns));

      if (filter && typeof filter === "object") {
        processed = processed.filter((r) => matchesFilter(r.data, filter));
      }

      if (sort?.field) {
        const { field, order = "asc" } = sort;
        processed.sort((a, b) => {
          const va = a.data[field], vb = b.data[field];
          if (va == null && vb == null) return 0;
          if (va == null) return 1;
          if (vb == null) return -1;
          if (va < vb) return order === "asc" ? -1 : 1;
          if (va > vb) return order === "asc" ? 1 : -1;
          return 0;
        });
      }

      const total = processed.length;
      return { rows: processed.slice(effectiveOffset, effectiveOffset + effectiveLimit), total };
    }

    case "get": {
      const { tableId, rowId } = params;
      if (!tableId || !rowId) throw new Error("tableId and rowId are required");
      const table = await getTableForTool(tableId, toolId);

      const row = await prisma.toolRow.findUnique({ where: { id: rowId } });
      if (!row || row.tableId !== tableId) throw new Error("找不到此筆資料");

      return { row: toRow(row, table.columns as unknown as ColumnDef[]) };
    }

    case "update": {
      const { tableId, rowId, data } = params;
      if (!tableId || !rowId || !data) throw new Error("tableId, rowId and data are required");
      const table = await getTableForTool(tableId, toolId);

      const existing = await prisma.toolRow.findUnique({ where: { id: rowId } });
      if (!existing || existing.tableId !== tableId) throw new Error("找不到此筆資料");

      const merged = { ...(existing.data as Record<string, unknown>), ...data };
      if (JSON.stringify(merged).length > MAX_ROW_SIZE) {
        throw new Error(`單筆資料超過 ${MAX_ROW_SIZE / 1024}KB 上限`);
      }

      const row = await prisma.toolRow.update({ where: { id: rowId }, data: { data: merged } });
      return { row: toRow(row, table.columns as unknown as ColumnDef[]) };
    }

    case "delete": {
      const { tableId, rowId } = params;
      if (!tableId || !rowId) throw new Error("tableId and rowId are required");
      await getTableForTool(tableId, toolId);

      const existing = await prisma.toolRow.findUnique({ where: { id: rowId } });
      if (!existing || existing.tableId !== tableId) throw new Error("找不到此筆資料");

      await prisma.toolRow.delete({ where: { id: rowId } });
      return { success: true };
    }

    default:
      throw new Error(`Unknown tooldb action: ${action}`);
  }
}
