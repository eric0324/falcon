import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the notion integration module
vi.mock("@/lib/integrations/notion", () => ({
  isNotionConfigured: vi.fn(() => true),
  queryDatabase: vi.fn(),
  queryDatabaseAll: vi.fn(),
  buildTitleContainsFilter: vi.fn(),
  listDatabases: vi.fn(),
  getPage: vi.fn(),
  getBlockChildrenDeep: vi.fn(),
  blocksToText: vi.fn(),
  notionSearch: vi.fn(),
}));

import { createNotionTools } from "./notion-tools";
import {
  queryDatabase,
  queryDatabaseAll,
  buildTitleContainsFilter,
  listDatabases,
  notionSearch,
} from "@/lib/integrations/notion";

const mockQueryDatabase = vi.mocked(queryDatabase);
const mockQueryDatabaseAll = vi.mocked(queryDatabaseAll);
const mockBuildTitleContainsFilter = vi.mocked(buildTitleContainsFilter);
const mockListDatabases = vi.mocked(listDatabases);
const mockNotionSearch = vi.mocked(notionSearch);

beforeEach(() => {
  vi.clearAllMocks();
  mockBuildTitleContainsFilter.mockImplementation((keyword: string) => ({
    property: "Name",
    title: { contains: keyword },
  }));
});

function makePage(id: string, title: string, parentType = "database_id") {
  return {
    id,
    url: `https://notion.so/${id}`,
    icon: undefined,
    parent: { type: parentType },
    properties: {
      Name: {
        type: "title",
        title: [{ plain_text: title }],
      },
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeNotionTool(params: Record<string, unknown>): Promise<any> {
  const tools = createNotionTools();
  return tools.notionSearch.execute!(
    params as never,
    { toolCallId: "test", messages: [], abortSignal: undefined as never }
  );
}

describe("notionSearch tool - query with search filter", () => {
  it("uses native title filter via queryDatabaseAll when search is provided", async () => {
    mockQueryDatabaseAll.mockResolvedValueOnce({
      results: [
        makePage("p1", "請假流程說明"),
        makePage("p2", "請假申請表"),
      ],
      hasMore: false,
    });

    const result = await executeNotionTool({
      action: "query",
      databaseId: "db-1",
      search: "請假",
      limit: 20,
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data[0].title).toBe("請假流程說明");
    expect(result.data[1].title).toBe("請假申請表");

    // Should use native filter, not client-side filtering
    expect(mockBuildTitleContainsFilter).toHaveBeenCalledWith("請假");
    expect(mockQueryDatabaseAll).toHaveBeenCalledWith(
      "db-1",
      { filter: { property: "Name", title: { contains: "請假" } } },
      20
    );
    // Should NOT call queryDatabase directly
    expect(mockQueryDatabase).not.toHaveBeenCalled();
  });

  it("returns all results when search is not provided", async () => {
    mockQueryDatabase.mockResolvedValueOnce({
      object: "list",
      results: [
        makePage("p1", "會議 A"),
        makePage("p2", "會議 B"),
      ],
      next_cursor: null,
      has_more: false,
    });

    const result = await executeNotionTool({
      action: "query",
      databaseId: "db-1",
      limit: 20,
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    // Should use simple queryDatabase, not queryDatabaseAll
    expect(mockQueryDatabase).toHaveBeenCalledWith("db-1", { page_size: 20 });
    expect(mockQueryDatabaseAll).not.toHaveBeenCalled();
  });

  it("respects limit when search returns more results", async () => {
    const pages = Array.from({ length: 30 }, (_, i) =>
      makePage(`p${i}`, `請假文件 ${i}`)
    );
    mockQueryDatabaseAll.mockResolvedValueOnce({
      results: pages,
      hasMore: true,
    });

    const result = await executeNotionTool({
      action: "query",
      databaseId: "db-1",
      search: "請假",
      limit: 10,
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(10);
    expect(result.metadata.has_more).toBe(true);
  });
});

describe("notionSearch tool - list with pagination", () => {
  it("paginates through multiple pages of results", async () => {
    // First page
    mockNotionSearch.mockResolvedValueOnce({
      object: "list",
      results: [
        { id: "db-1", title: [{ plain_text: "知識庫" }], description: [], url: "https://notion.so/db-1" },
        makePage("p1", "公司簡介", "workspace"),
      ],
      next_cursor: "cursor-1",
      has_more: true,
    });
    // Second page
    mockNotionSearch.mockResolvedValueOnce({
      object: "list",
      results: [
        { id: "db-2", title: [{ plain_text: "會議記錄" }], description: [], url: "https://notion.so/db-2" },
        makePage("p2", "請假流程", "workspace"),
      ],
      next_cursor: null,
      has_more: false,
    });

    const result = await executeNotionTool({ action: "list" });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(4);
    expect(result.data.map((d: { title: string }) => d.title)).toEqual([
      "知識庫", "公司簡介", "會議記錄", "請假流程",
    ]);

    // Should have called notionSearch twice (pagination)
    expect(mockNotionSearch).toHaveBeenCalledTimes(2);
    expect(mockNotionSearch).toHaveBeenNthCalledWith(1, { page_size: 100 });
    expect(mockNotionSearch).toHaveBeenNthCalledWith(2, { page_size: 100, start_cursor: "cursor-1" });
  });

  it("deduplicates results across pages", async () => {
    const db = { id: "db-1", title: [{ plain_text: "知識庫" }], description: [], url: "https://notion.so/db-1" };
    mockNotionSearch.mockResolvedValueOnce({
      object: "list",
      results: [db],
      next_cursor: "cursor-1",
      has_more: true,
    });
    mockNotionSearch.mockResolvedValueOnce({
      object: "list",
      results: [db], // duplicate
      next_cursor: null,
      has_more: false,
    });

    const result = await executeNotionTool({ action: "list" });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  it("stops after maxRounds to avoid infinite loops", async () => {
    // Simulate a workspace where every result is a database-child page (gets filtered out)
    // The loop should still stop after 5 rounds
    for (let i = 0; i < 5; i++) {
      mockNotionSearch.mockResolvedValueOnce({
        object: "list",
        results: [makePage(`p${i}`, `DB 內頁面 ${i}`, "database_id")],
        next_cursor: `cursor-${i + 1}`,
        has_more: true,
      });
    }

    const result = await executeNotionTool({ action: "list" });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(0); // all filtered out
    expect(mockNotionSearch).toHaveBeenCalledTimes(5); // stopped at 5 rounds
  });

  it("skips pages that belong to databases", async () => {
    mockNotionSearch.mockResolvedValueOnce({
      object: "list",
      results: [
        makePage("p1", "獨立頁面", "workspace"),
        makePage("p2", "資料庫內頁面", "database_id"), // should be skipped
      ],
      next_cursor: null,
      has_more: false,
    });

    const result = await executeNotionTool({ action: "list" });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].title).toBe("獨立頁面");
  });
});

describe("notionSearch tool - searchAll across all databases and pages", () => {
  function setupSearchAll(options: {
    databases?: Array<{ id: string; title: string }>;
    dbResults?: Record<string, Array<{ id: string; title: string }>>;
    dbErrors?: string[];
    standalonePages?: Array<{ id: string; title: string; parentType: string }>;
  }) {
    const { databases = [], dbResults = {}, dbErrors = [], standalonePages = [] } = options;

    mockListDatabases.mockResolvedValueOnce(
      databases.map((db) => ({
        id: db.id,
        title: [{ plain_text: db.title }],
        description: [],
        url: `https://notion.so/${db.id}`,
      }))
    );

    mockQueryDatabaseAll.mockImplementation(async (dbId) => {
      if (dbErrors.includes(dbId)) throw new Error("API error");
      const pages = dbResults[dbId] || [];
      return { results: pages.map((p) => makePage(p.id, p.title)), hasMore: false };
    });

    // notionSearch returns standalone pages
    mockNotionSearch.mockResolvedValueOnce({
      object: "list",
      results: standalonePages.map((p) => makePage(p.id, p.title, p.parentType)),
      next_cursor: null,
      has_more: false,
    });
  }

  it("finds pages in databases via title filter", async () => {
    setupSearchAll({
      databases: [
        { id: "db-hr", title: "人事制度" },
        { id: "db-admin", title: "行政組" },
      ],
      dbResults: {
        "db-hr": [
          { id: "p1", title: "請假流程說明" },
          { id: "p2", title: "請假申請表" },
        ],
      },
    });

    const result = await executeNotionTool({ action: "searchAll", search: "請假" });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data[0].source).toBe("📊 人事制度");
    expect(result.metadata.databasesSearched).toBe(2);
  });

  it("finds standalone pages by title match", async () => {
    setupSearchAll({
      databases: [],
      standalonePages: [
        { id: "p1", title: "請假流程", parentType: "workspace" },
        { id: "p2", title: "公司簡介", parentType: "workspace" },
      ],
    });

    const result = await executeNotionTool({ action: "searchAll", search: "請假" });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].title).toBe("請假流程");
    expect(result.data[0].source).toBe("📄 獨立頁面");
  });

  it("combines database results and standalone page results", async () => {
    setupSearchAll({
      databases: [{ id: "db-1", title: "人事" }],
      dbResults: { "db-1": [{ id: "p1", title: "請假規定" }] },
      standalonePages: [
        { id: "p2", title: "請假流程總覽", parentType: "workspace" },
      ],
    });

    const result = await executeNotionTool({ action: "searchAll", search: "請假" });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    const titles = result.data.map((d: { title: string }) => d.title);
    expect(titles).toContain("請假規定");
    expect(titles).toContain("請假流程總覽");
  });

  it("deduplicates results across databases and pages", async () => {
    setupSearchAll({
      databases: [{ id: "db-1", title: "人事" }],
      dbResults: { "db-1": [{ id: "same-id", title: "請假流程" }] },
      standalonePages: [
        { id: "same-id", title: "請假流程", parentType: "database_id" },
      ],
    });

    const result = await executeNotionTool({ action: "searchAll", search: "請假" });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  it("handles database query errors gracefully", async () => {
    setupSearchAll({
      databases: [
        { id: "db-ok", title: "正常" },
        { id: "db-err", title: "壞掉" },
      ],
      dbResults: { "db-ok": [{ id: "p1", title: "請假規定" }] },
      dbErrors: ["db-err"],
    });

    const result = await executeNotionTool({ action: "searchAll", search: "請假" });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].title).toBe("請假規定");
  });

  it("respects limit parameter", async () => {
    const pages = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, title: `請假文件 ${i}` }));
    setupSearchAll({
      databases: [{ id: "db-1", title: "DB1" }],
      dbResults: { "db-1": pages },
    });

    const result = await executeNotionTool({ action: "searchAll", search: "請假", limit: 3 });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(3);
  });
});
