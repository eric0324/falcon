import { prisma } from "@/lib/prisma";

interface LogEntry {
  userId: string;
  conversationId?: string;
  toolId?: string;
  source: "chat" | "bridge";
  dataSourceId: string;
  action: string;
  toolName?: string;
  params?: unknown;
  response?: unknown;
  success: boolean;
  error?: string;
  durationMs?: number;
  rowCount?: number;
}

/** Fire-and-forget：記錄資料來源呼叫，不阻塞主流程 */
export function logDataSourceCall(entry: LogEntry): void {
  prisma.dataSourceLog
    .create({
      data: {
        userId: entry.userId,
        conversationId: entry.conversationId ?? null,
        toolId: entry.toolId ?? null,
        source: entry.source,
        dataSourceId: entry.dataSourceId,
        action: entry.action,
        toolName: entry.toolName ?? null,
        params: entry.params != null ? (entry.params as object) : undefined,
        response: entry.response != null ? (entry.response as object) : undefined,
        success: entry.success,
        error: entry.error ?? null,
        durationMs: entry.durationMs ?? null,
        rowCount: entry.rowCount ?? null,
      },
    })
    .catch((e) => console.error("[DataSourceLog] Failed to write log:", e));
}

/**
 * 從 AI tool 名稱和參數解析出資料來源資訊。
 * 回傳 null 代表不是資料來源相關的 tool，不需記錄。
 */
export function extractDataSourceInfo(
  toolName: string,
  args: Record<string, unknown>
): { dataSourceId: string; action: string; params: Record<string, unknown> } | null {
  switch (toolName) {
    case "listTables":
      return { dataSourceId: `extdb_${args.databaseId}`, action: "listTables", params: {} };
    case "getTableSchema":
      return {
        dataSourceId: `extdb_${args.databaseId}`,
        action: "getSchema",
        params: { tableName: args.tableName },
      };
    case "queryDatabase":
      return {
        dataSourceId: `extdb_${args.databaseId}`,
        action: "query",
        params: { sql: args.sql },
      };
    case "googleSearch":
      return {
        dataSourceId: `google_${args.service}`,
        action: (args.action as string) || "search",
        params: { search: args.search },
      };
    case "notionSearch":
      return {
        dataSourceId: "notion",
        action: (args.action as string) || "search",
        params: { search: args.search, databaseId: args.databaseId, pageId: args.pageId },
      };
    case "slackSearch":
      return {
        dataSourceId: "slack",
        action: (args.action as string) || "search",
        params: { search: args.search, channelId: args.channelId },
      };
    case "asanaSearch":
      return {
        dataSourceId: "asana",
        action: (args.action as string) || "search",
        params: { search: args.search, projectId: args.projectId },
      };
    case "plausibleQuery":
      return {
        dataSourceId: "plausible",
        action: args.action as string,
        params: { dateRange: args.dateRange, dimension: args.dimension },
      };
    case "ga4Query":
      return {
        dataSourceId: "ga4",
        action: args.action as string,
        params: { dateRange: args.dateRange, dimension: args.dimension },
      };
    case "metaAdsQuery":
      return {
        dataSourceId: "meta_ads",
        action: args.action as string,
        params: { accountId: args.accountId, dateRange: args.dateRange },
      };
    case "githubQuery":
      return {
        dataSourceId: "github",
        action: args.action as string,
        params: { repo: args.repo, search: args.search },
      };
    default:
      return null;
  }
}

/** 過濾工具回傳，保留 metadata 移除大型 data 陣列 */
export function sanitizeResponse(
  output: Record<string, unknown> | null | undefined
): Record<string, unknown> | undefined {
  if (!output) return undefined;
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(output)) {
    // 略過大型陣列（如完整資料列）
    if (Array.isArray(value)) {
      sanitized[key] = `[${value.length} items]`;
      continue;
    }
    // 略過大型物件
    if (typeof value === "object" && value !== null) {
      const str = JSON.stringify(value);
      if (str.length > 500) {
        sanitized[key] = "(truncated)";
        continue;
      }
      sanitized[key] = value;
      continue;
    }
    // 保留 primitive 值
    if (typeof value === "string" && value.length > 500) {
      sanitized[key] = value.slice(0, 500) + "...";
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/** 過濾 bridge params，保留有用的查詢資訊，移除過大的資料 */
export function sanitizeBridgeParams(
  action: string,
  params: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!params) return {};
  const { sql, search, query, tableName, databaseId, ...rest } = params;
  const sanitized: Record<string, unknown> = {};
  if (sql !== undefined) sanitized.sql = sql;
  if (search !== undefined) sanitized.search = search;
  if (query !== undefined) sanitized.query = query;
  if (tableName !== undefined) sanitized.tableName = tableName;
  if (databaseId !== undefined) sanitized.databaseId = databaseId;
  // 保留小型字串欄位，過濾掉大型物件
  for (const [key, value] of Object.entries(rest)) {
    if (typeof value === "string" && value.length < 500) {
      sanitized[key] = value;
    } else if (typeof value === "number" || typeof value === "boolean") {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
