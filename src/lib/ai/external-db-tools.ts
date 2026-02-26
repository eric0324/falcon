import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { executeQuery, validateTableAccess, type DbConnectionConfig } from "@/lib/external-db";

async function getUserGroupIds(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { groups: { select: { id: true } } },
  });
  return user?.groups.map((r) => r.id) ?? [];
}

async function getDbConfig(databaseId: string): Promise<DbConnectionConfig> {
  const db = await prisma.externalDatabase.findUniqueOrThrow({
    where: { id: databaseId },
  });
  return {
    type: db.type,
    host: db.host,
    port: db.port,
    database: db.database,
    username: db.username,
    password: decrypt(db.password),
    sslEnabled: db.sslEnabled,
  };
}

export function createExternalDbTools(userId: string, databaseIds: string[]) {
  return {
    listTables: tool({
      description:
        "列出外部資料庫中你可以查詢的資料表。先用此工具了解有哪些資料表可用。",
      inputSchema: z.object({
        databaseId: z
          .enum(databaseIds as [string, ...string[]])
          .describe("要查詢的資料庫 ID"),
      }),
      execute: async ({ databaseId }) => {
        try {
          const groupIds = await getUserGroupIds(userId);
          if (groupIds.length === 0) {
            return { success: true, tables: [], hint: "使用者無任何群組，無法存取資料表" };
          }

          const tables = await prisma.externalDatabaseTable.findMany({
            where: {
              databaseId,
              hidden: false,
              allowedGroups: { some: { id: { in: groupIds } } },
            },
            select: { tableName: true, note: true },
            orderBy: { tableName: "asc" },
          });

          return {
            success: true,
            tables: tables.map((t) => ({
              name: t.tableName,
              note: t.note,
            })),
            hint: "使用 getTableSchema 查看資料表的欄位結構",
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),

    getTableSchema: tool({
      description:
        "取得指定資料表的欄位定義（名稱、型別、備註）。用來了解資料表結構以組合 SQL。",
      inputSchema: z.object({
        databaseId: z
          .enum(databaseIds as [string, ...string[]])
          .describe("資料庫 ID"),
        tableName: z.string().describe("資料表名稱"),
      }),
      execute: async ({ databaseId, tableName }) => {
        try {
          const groupIds = await getUserGroupIds(userId);
          if (groupIds.length === 0) {
            return { success: false, error: "使用者無任何群組，無法存取" };
          }

          const table = await prisma.externalDatabaseTable.findFirst({
            where: {
              databaseId,
              tableName,
              hidden: false,
              allowedGroups: { some: { id: { in: groupIds } } },
            },
            select: {
              note: true,
              columns: {
                where: {
                  allowedGroups: { some: { id: { in: groupIds } } },
                },
                select: {
                  columnName: true,
                  dataType: true,
                  note: true,
                },
                orderBy: { columnName: "asc" },
              },
            },
          });

          if (!table) {
            return { success: false, error: "找不到資料表或無權存取" };
          }

          return {
            success: true,
            tableName,
            tableNote: table.note,
            columns: table.columns.map((c) => ({
              name: c.columnName,
              type: c.dataType,
              note: c.note,
            })),
            hint: "根據欄位資訊組合 SELECT 查詢，然後用 queryDatabase 執行",
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),

    queryDatabase: tool({
      description:
        "對外部資料庫執行 SQL 查詢（僅支援 SELECT，單次最多 1000 筆，支援 limit/offset 分頁）。",
      inputSchema: z.object({
        databaseId: z
          .enum(databaseIds as [string, ...string[]])
          .describe("資料庫 ID"),
        sql: z.string().describe("SELECT SQL 語句"),
        limit: z.number().optional().describe("回傳筆數上限（預設 200，最大 1000）"),
        offset: z.number().optional().describe("跳過前 N 筆（用於分頁）"),
      }),
      execute: async ({ databaseId, sql, limit, offset }) => {
        try {
          // Verify user can only query tables they have access to
          const groupIds = await getUserGroupIds(userId);
          if (groupIds.length === 0) {
            return { success: false, error: "使用者無任何群組，無法查詢" };
          }

          const allowedTables = await prisma.externalDatabaseTable.findMany({
            where: {
              databaseId,
              hidden: false,
              allowedGroups: { some: { id: { in: groupIds } } },
            },
            select: { tableName: true },
          });
          validateTableAccess(sql, allowedTables.map((t) => t.tableName));

          const config = await getDbConfig(databaseId);
          const result = await executeQuery(config, sql, { limit, offset });
          return {
            success: true,
            rows: result.rows,
            rowCount: result.rowCount,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),
  };
}
