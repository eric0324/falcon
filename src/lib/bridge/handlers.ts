/**
 * Bridge handlers — dispatch bridge requests to existing connectors/integrations.
 * Each handler receives (userId, action, params) and returns the result data.
 */

import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import {
  executeQuery,
  validateTableAccess,
  type DbConnectionConfig,
} from "@/lib/external-db";
import { GoogleSheetsConnector } from "@/lib/connectors/google/sheets";
import { GoogleDriveConnector } from "@/lib/connectors/google/drive";
import { GoogleCalendarConnector } from "@/lib/connectors/google/calendar";
import { GoogleGmailConnector } from "@/lib/connectors/google/gmail";
import {
  isNotionConfigured,
  listDatabases,
  queryDatabase,
  getPage,
  getBlockChildrenDeep,
  blocksToText,
  notionSearch,
} from "@/lib/integrations/notion";
import {
  isSlackConfigured,
  isSlackSearchConfigured,
  listChannels,
  getChannelMessages,
  getThreadReplies,
  searchMessages,
} from "@/lib/integrations/slack";
import {
  isGitHubConfigured,
  listRepos,
  listPullRequests,
  getPullRequest,
  searchCode,
  listCommits,
} from "@/lib/integrations/github";
import {
  isAsanaConfigured,
  listProjects,
  getProjectTasks,
  getTask,
  getTaskStories,
  searchTasks,
} from "@/lib/integrations/asana";
import {
  isPlausibleConfigured,
  getRealtimeVisitors,
  queryAggregate as plausibleAggregate,
  queryTimeseries as plausibleTimeseries,
  queryBreakdown as plausibleBreakdown,
} from "@/lib/integrations/plausible";
import {
  isGA4Configured,
  getRealtimeUsers,
  queryAggregate as ga4Aggregate,
  queryTimeseries as ga4Timeseries,
  queryBreakdown as ga4Breakdown,
} from "@/lib/integrations/ga4";
import {
  isMetaAdsConfigured,
  parseAccounts,
  queryOverview,
  queryCampaigns,
  queryAdsets,
  queryAds,
  queryTimeseries as metaTimeseries,
  queryBreakdown as metaBreakdown,
} from "@/lib/integrations/meta-ads";
import {
  isVimeoConfigured,
  listVideos as vimeoListVideos,
  getVideo as vimeoGetVideo,
  listFolders as vimeoListFolders,
  getFolderVideos as vimeoGetFolderVideos,
  getAnalytics as vimeoGetAnalytics,
} from "@/lib/integrations/vimeo";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Params = Record<string, any>;

// ===== External Database =====

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

async function handleExtDb(
  userId: string,
  databaseId: string,
  action: string,
  params: Params
): Promise<unknown> {
  const groupIds = await getUserGroupIds(userId);
  if (groupIds.length === 0) throw new Error("使用者無任何群組，無法存取資料");

  switch (action) {
    case "listTables": {
      const tables = await prisma.externalDatabaseTable.findMany({
        where: {
          databaseId,
          hidden: false,
          allowedGroups: { some: { id: { in: groupIds } } },
        },
        select: { tableName: true, note: true },
        orderBy: { tableName: "asc" },
      });
      return tables.map((t) => ({ name: t.tableName, note: t.note }));
    }

    case "getSchema": {
      const tableName = params.tableName;
      if (!tableName) throw new Error("tableName is required");
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
            where: { allowedGroups: { some: { id: { in: groupIds } } } },
            select: { columnName: true, dataType: true, note: true },
            orderBy: { columnName: "asc" },
          },
        },
      });
      if (!table) throw new Error("找不到資料表或無權存取");
      return {
        tableName,
        tableNote: table.note,
        columns: table.columns.map((c) => ({
          name: c.columnName,
          type: c.dataType,
          note: c.note,
        })),
      };
    }

    case "query": {
      const sql = params.sql;
      if (!sql) throw new Error("sql is required");
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
      const limit = typeof params.limit === "number" ? params.limit : undefined;
      const offset = typeof params.offset === "number" ? params.offset : undefined;
      const result = await executeQuery(config, sql, { limit, offset });
      return { rows: result.rows, rowCount: result.rowCount };
    }

    default:
      throw new Error(`Unknown extdb action: ${action}`);
  }
}

// ===== Google Services =====

async function handleGoogle(
  userId: string,
  service: string,
  action: string,
  params: Params
): Promise<unknown> {
  const connectorMap: Record<string, () => GoogleSheetsConnector | GoogleDriveConnector | GoogleCalendarConnector | GoogleGmailConnector> = {
    sheets: () => new GoogleSheetsConnector(userId),
    drive: () => new GoogleDriveConnector(userId),
    calendar: () => new GoogleCalendarConnector(userId),
    gmail: () => new GoogleGmailConnector(userId),
  };

  const factory = connectorMap[service];
  if (!factory) throw new Error(`Unknown Google service: ${service}`);

  const connector = factory();
  await connector.connect();

  const filters: Record<string, unknown> = {};
  if (params.search) filters.search = params.search;
  if (params.mimeType) filters.mimeType = params.mimeType;
  if (params.timeMin) filters.timeMin = params.timeMin;
  if (params.timeMax) filters.timeMax = params.timeMax;
  if (params.label) filters.label = params.label;

  switch (action) {
    case "search":
    case "list":
    case "read": {
      const result = await connector.list({
        resource: params.resource || "",
        filters,
        limit: params.limit || 20,
      });
      if (!result.success) throw new Error(result.error || "Google operation failed");
      return result.data;
    }
    case "create": {
      const result = await connector.create({
        resource: params.resource || "",
        data: params.data || {},
      });
      if (!result.success) throw new Error(result.error || "Google create failed");
      return result.data;
    }
    case "update": {
      const result = await connector.update({
        resource: params.resource || "",
        data: params.data || {},
      });
      if (!result.success) throw new Error(result.error || "Google update failed");
      return result.data;
    }
    default:
      throw new Error(`Unknown Google action: ${action}`);
  }
}

// ===== Notion =====

async function handleNotion(action: string, params: Params): Promise<unknown> {
  if (!isNotionConfigured()) throw new Error("Notion 尚未設定");

  switch (action) {
    case "list": {
      const result = await listDatabases();
      return result;
    }
    case "query": {
      if (!params.databaseId) throw new Error("databaseId is required");
      const result = await queryDatabase(params.databaseId, {
        page_size: params.limit || 20,
      });
      return result.results;
    }
    case "read": {
      if (!params.pageId) throw new Error("pageId is required");
      const page = await getPage(params.pageId);
      const blocks = await getBlockChildrenDeep(params.pageId);
      return { ...page, content: blocksToText(blocks) };
    }
    case "search": {
      if (!params.search) throw new Error("search keyword is required");
      const result = await notionSearch({
        query: params.search,
        page_size: params.limit || 20,
      });
      return result.results;
    }
    default:
      throw new Error(`Unknown Notion action: ${action}`);
  }
}

// ===== Slack =====

async function handleSlack(action: string, params: Params): Promise<unknown> {
  if (!isSlackConfigured()) throw new Error("Slack 尚未設定");

  switch (action) {
    case "list":
      return await listChannels();
    case "read": {
      if (!params.channelId) throw new Error("channelId is required");
      return await getChannelMessages(params.channelId, params.limit || 20);
    }
    case "thread": {
      if (!params.channelId || !params.threadTs) {
        throw new Error("channelId and threadTs are required");
      }
      return await getThreadReplies(params.channelId, params.threadTs);
    }
    case "search": {
      if (!params.search) throw new Error("search keyword is required");
      if (!isSlackSearchConfigured()) throw new Error("搜尋功能未啟用");
      return await searchMessages(params.search, params.limit || 20);
    }
    default:
      throw new Error(`Unknown Slack action: ${action}`);
  }
}

// ===== GitHub =====

async function handleGitHub(action: string, params: Params): Promise<unknown> {
  if (!isGitHubConfigured()) throw new Error("GitHub is not configured");

  switch (action) {
    case "listRepos":
      return await listRepos(params.org, params.limit || 20);
    case "listPRs": {
      if (!params.repo) throw new Error("repo is required");
      return await listPullRequests(params.repo, params.state || "open", params.limit || 20);
    }
    case "readPR": {
      if (!params.repo || !params.prNumber) throw new Error("repo and prNumber are required");
      return await getPullRequest(params.repo, params.prNumber);
    }
    case "searchCode": {
      if (!params.search) throw new Error("search query is required");
      return await searchCode(params.search, params.repo, params.limit || 10);
    }
    case "commits": {
      if (!params.repo) throw new Error("repo is required");
      return await listCommits(params.repo, params.branch, params.limit || 20);
    }
    default:
      throw new Error(`Unknown GitHub action: ${action}`);
  }
}

// ===== Asana =====

async function handleAsana(action: string, params: Params): Promise<unknown> {
  if (!isAsanaConfigured()) throw new Error("Asana 尚未設定");

  switch (action) {
    case "list":
      return await listProjects(params.search);
    case "tasks": {
      if (!params.projectId) throw new Error("projectId is required");
      return await getProjectTasks(params.projectId);
    }
    case "read": {
      if (!params.taskId) throw new Error("taskId is required");
      return await getTask(params.taskId);
    }
    case "comments": {
      if (!params.taskId) throw new Error("taskId is required");
      return await getTaskStories(params.taskId);
    }
    case "search": {
      if (!params.search) throw new Error("search keyword is required");
      return await searchTasks(params.search, params.limit || 20);
    }
    default:
      throw new Error(`Unknown Asana action: ${action}`);
  }
}

// ===== Plausible =====

async function handlePlausible(action: string, params: Params): Promise<unknown> {
  if (!isPlausibleConfigured()) throw new Error("Plausible is not configured");

  const filters: Record<string, string> = {};
  for (const key of ["page", "source", "country", "device", "utm_source", "utm_medium", "utm_campaign"]) {
    if (params[key]) filters[key] = params[key];
  }

  switch (action) {
    case "realtime":
      return { visitors: await getRealtimeVisitors() };
    case "aggregate":
      return await plausibleAggregate(params.dateRange || "30d", filters, params.startDate, params.endDate);
    case "timeseries":
      return await plausibleTimeseries(params.dateRange || "30d", params.period || "day", filters, params.startDate, params.endDate);
    case "breakdown":
      return await plausibleBreakdown(params.dimension || "source", params.dateRange || "30d", filters, params.limit || 10, params.startDate, params.endDate);
    default:
      throw new Error(`Unknown Plausible action: ${action}`);
  }
}

// ===== GA4 =====

async function handleGA4(action: string, params: Params): Promise<unknown> {
  if (!isGA4Configured()) throw new Error("GA4 is not configured");

  const filters: Record<string, string> = {};
  for (const key of ["page", "source", "country", "device", "event"]) {
    if (params[key]) filters[key] = params[key];
  }

  switch (action) {
    case "realtime":
      return { activeUsers: await getRealtimeUsers() };
    case "aggregate":
      return await ga4Aggregate(params.dateRange || "30d", filters, params.startDate, params.endDate);
    case "timeseries":
      return await ga4Timeseries(params.dateRange || "30d", params.period || "day", filters, params.startDate, params.endDate);
    case "breakdown":
      return await ga4Breakdown(params.dimension || "source", params.dateRange || "30d", filters, params.limit || 10, params.startDate, params.endDate);
    default:
      throw new Error(`Unknown GA4 action: ${action}`);
  }
}

// ===== Meta Ads =====

async function handleMetaAds(action: string, params: Params): Promise<unknown> {
  if (!isMetaAdsConfigured()) throw new Error("Meta Ads is not configured");

  switch (action) {
    case "listAccounts":
      return parseAccounts();
    case "overview":
      return await queryOverview(params.dateRange || "last_14d", params.accountId, params.startDate, params.endDate);
    case "campaigns":
      return await queryCampaigns(params.dateRange || "last_14d", params.accountId, params.limit || 25, params.startDate, params.endDate, params.campaignNameFilter);
    case "adsets":
      return await queryAdsets(params.dateRange || "last_14d", params.accountId, params.limit || 25, params.startDate, params.endDate, params.campaignNameFilter);
    case "ads":
      return await queryAds(params.dateRange || "last_14d", params.accountId, params.limit || 25, params.startDate, params.endDate, params.campaignNameFilter);
    case "timeseries":
      return await metaTimeseries(params.dateRange || "last_14d", params.accountId, params.period || "day", params.startDate, params.endDate);
    case "breakdown":
      return await metaBreakdown(params.dimension || "age", params.dateRange || "last_14d", params.accountId, params.startDate, params.endDate);
    default:
      throw new Error(`Unknown Meta Ads action: ${action}`);
  }
}

// ===== Vimeo =====

async function handleVimeo(action: string, params: Params): Promise<unknown> {
  if (!isVimeoConfigured()) throw new Error("Vimeo is not configured");

  switch (action) {
    case "videos":
      return await vimeoListVideos(params.maxResults || 25);
    case "video":
      return await vimeoGetVideo(params.videoId);
    case "folders":
      return await vimeoListFolders(params.maxResults || 25);
    case "folder_videos":
      return await vimeoGetFolderVideos(params.folderId, params.maxResults || 25);
    case "analytics":
      return await vimeoGetAnalytics({
        startDate: params.startDate,
        endDate: params.endDate,
        dimension: params.dimension,
        timeInterval: params.timeInterval,
        videoUri: params.videoUri,
        folderUri: params.folderUri,
      });
    default:
      throw new Error(`Unknown Vimeo action: ${action}`);
  }
}

// ===== Main Dispatcher =====

export async function dispatchBridge(
  userId: string,
  dataSourceId: string,
  action: string,
  params: Params
): Promise<unknown> {
  // External database: extdb_{databaseId}
  if (dataSourceId.startsWith("extdb_")) {
    const databaseId = dataSourceId.replace("extdb_", "");
    return handleExtDb(userId, databaseId, action, params);
  }

  // Google services: google_{service}
  if (dataSourceId.startsWith("google_")) {
    const service = dataSourceId.replace("google_", "");
    return handleGoogle(userId, service, action, params);
  }

  // Simple prefix-to-handler mapping
  const handlers: Record<string, (action: string, params: Params) => Promise<unknown>> = {
    notion: handleNotion,
    slack: handleSlack,
    github: handleGitHub,
    asana: handleAsana,
    plausible: handlePlausible,
    ga4: handleGA4,
    meta_ads: handleMetaAds,
    vimeo: handleVimeo,
  };

  const handler = handlers[dataSourceId];
  if (!handler) {
    throw new Error(`Unknown data source: ${dataSourceId}`);
  }

  return handler(action, params);
}
