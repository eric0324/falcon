import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractDataSourceInfo, sanitizeBridgeParams } from "./data-source-log";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    dataSourceLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

describe("extractDataSourceInfo", () => {
  it("parses listTables tool", () => {
    const result = extractDataSourceInfo("listTables", { databaseId: "abc" });
    expect(result).toEqual({
      dataSourceId: "extdb_abc",
      action: "listTables",
      params: {},
    });
  });

  it("parses getTableSchema tool", () => {
    const result = extractDataSourceInfo("getTableSchema", {
      databaseId: "abc",
      tableName: "users",
    });
    expect(result).toEqual({
      dataSourceId: "extdb_abc",
      action: "getSchema",
      params: { tableName: "users" },
    });
  });

  it("parses queryDatabase tool", () => {
    const result = extractDataSourceInfo("queryDatabase", {
      databaseId: "db1",
      sql: "SELECT * FROM orders",
    });
    expect(result).toEqual({
      dataSourceId: "extdb_db1",
      action: "query",
      params: { sql: "SELECT * FROM orders" },
    });
  });

  it("parses googleSearch tool", () => {
    const result = extractDataSourceInfo("googleSearch", {
      service: "sheets",
      action: "read",
      search: "Q1 report",
    });
    expect(result).toEqual({
      dataSourceId: "google_sheets",
      action: "read",
      params: { search: "Q1 report" },
    });
  });

  it("parses notionSearch tool", () => {
    const result = extractDataSourceInfo("notionSearch", {
      action: "search",
      search: "meeting notes",
      databaseId: "ndb1",
      pageId: undefined,
    });
    expect(result).toEqual({
      dataSourceId: "notion",
      action: "search",
      params: { search: "meeting notes", databaseId: "ndb1", pageId: undefined },
    });
  });

  it("parses slackSearch tool", () => {
    const result = extractDataSourceInfo("slackSearch", {
      action: "search",
      search: "deploy",
      channelId: "C123",
    });
    expect(result).toEqual({
      dataSourceId: "slack",
      action: "search",
      params: { search: "deploy", channelId: "C123" },
    });
  });

  it("parses asanaSearch tool", () => {
    const result = extractDataSourceInfo("asanaSearch", {
      action: "search",
      search: "bug fix",
      projectId: "proj1",
    });
    expect(result).toEqual({
      dataSourceId: "asana",
      action: "search",
      params: { search: "bug fix", projectId: "proj1" },
    });
  });

  it("parses plausibleQuery tool", () => {
    const result = extractDataSourceInfo("plausibleQuery", {
      action: "aggregate",
      dateRange: "7d",
      dimension: "page",
    });
    expect(result).toEqual({
      dataSourceId: "plausible",
      action: "aggregate",
      params: { dateRange: "7d", dimension: "page" },
    });
  });

  it("parses ga4Query tool", () => {
    const result = extractDataSourceInfo("ga4Query", {
      action: "report",
      dateRange: "30d",
      dimension: "country",
    });
    expect(result).toEqual({
      dataSourceId: "ga4",
      action: "report",
      params: { dateRange: "30d", dimension: "country" },
    });
  });

  it("parses metaAdsQuery tool", () => {
    const result = extractDataSourceInfo("metaAdsQuery", {
      action: "insights",
      accountId: "act_123",
      dateRange: "7d",
    });
    expect(result).toEqual({
      dataSourceId: "meta_ads",
      action: "insights",
      params: { accountId: "act_123", dateRange: "7d" },
    });
  });

  it("parses githubQuery tool", () => {
    const result = extractDataSourceInfo("githubQuery", {
      action: "listIssues",
      repo: "org/repo",
      search: "bug",
    });
    expect(result).toEqual({
      dataSourceId: "github",
      action: "listIssues",
      params: { repo: "org/repo", search: "bug" },
    });
  });

  it("returns null for non-data-source tools", () => {
    expect(extractDataSourceInfo("updateCode", { code: "<div/>" })).toBeNull();
    expect(extractDataSourceInfo("generateImage", { prompt: "cat" })).toBeNull();
    expect(extractDataSourceInfo("unknownTool", {})).toBeNull();
  });

  it("defaults googleSearch action to search when not provided", () => {
    const result = extractDataSourceInfo("googleSearch", { service: "drive" });
    expect(result!.action).toBe("search");
  });
});

describe("sanitizeBridgeParams", () => {
  it("keeps sql and search params", () => {
    const result = sanitizeBridgeParams("query", {
      sql: "SELECT 1",
      search: "test",
    });
    expect(result).toEqual({ sql: "SELECT 1", search: "test" });
  });

  it("keeps small string params", () => {
    const result = sanitizeBridgeParams("query", {
      tableName: "users",
      shortField: "abc",
    });
    expect(result).toEqual({ tableName: "users", shortField: "abc" });
  });

  it("filters out large string params", () => {
    const result = sanitizeBridgeParams("query", {
      sql: "SELECT 1",
      bigData: "x".repeat(600),
    });
    expect(result).toEqual({ sql: "SELECT 1" });
  });

  it("keeps number and boolean params", () => {
    const result = sanitizeBridgeParams("query", {
      limit: 10,
      verbose: true,
    });
    expect(result).toEqual({ limit: 10, verbose: true });
  });

  it("returns empty object for null/undefined params", () => {
    expect(sanitizeBridgeParams("query", null)).toEqual({});
    expect(sanitizeBridgeParams("query", undefined)).toEqual({});
  });
});

describe("logDataSourceCall", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls prisma.dataSourceLog.create with correct data", async () => {
    // Dynamic import to get the mocked version
    const { prisma } = await import("@/lib/prisma");
    const { logDataSourceCall } = await import("./data-source-log");

    logDataSourceCall({
      userId: "user1",
      conversationId: "conv1",
      source: "chat",
      dataSourceId: "extdb_abc",
      action: "query",
      toolName: "queryDatabase",
      params: { sql: "SELECT 1" },
      success: true,
      durationMs: 150,
      rowCount: 5,
    });

    expect(prisma.dataSourceLog.create).toHaveBeenCalledWith({
      data: {
        userId: "user1",
        conversationId: "conv1",
        toolId: null,
        source: "chat",
        dataSourceId: "extdb_abc",
        action: "query",
        toolName: "queryDatabase",
        params: { sql: "SELECT 1" },
        success: true,
        error: null,
        durationMs: 150,
        rowCount: 5,
      },
    });
  });

  it("sets optional fields to null when not provided", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { logDataSourceCall } = await import("./data-source-log");

    logDataSourceCall({
      userId: "user1",
      source: "bridge",
      dataSourceId: "notion",
      action: "search",
      success: false,
      error: "Not found",
    });

    expect(prisma.dataSourceLog.create).toHaveBeenCalledWith({
      data: {
        userId: "user1",
        conversationId: null,
        toolId: null,
        source: "bridge",
        dataSourceId: "notion",
        action: "search",
        toolName: null,
        params: undefined,
        success: false,
        error: "Not found",
        durationMs: null,
        rowCount: null,
      },
    });
  });
});
