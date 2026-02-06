import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the notion integration module
vi.mock("@/lib/integrations/notion", () => ({
  isNotionConfigured: vi.fn(() => true),
  queryDatabase: vi.fn(),
  getPage: vi.fn(),
  getBlockChildrenDeep: vi.fn(),
  blocksToText: vi.fn(),
  notionSearch: vi.fn(),
}));

import { createNotionTools } from "./notion-tools";
import { queryDatabase } from "@/lib/integrations/notion";

const mockQueryDatabase = vi.mocked(queryDatabase);

beforeEach(() => {
  vi.clearAllMocks();
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
  it("filters query results by title keyword", async () => {
    mockQueryDatabase.mockResolvedValueOnce({
      object: "list",
      results: [
        makePage("p1", "第 30 次會議記錄 - 合購機制調整"),
        makePage("p2", "第 29 次會議記錄 - 績效制度"),
        makePage("p3", "第 28 次會議記錄 - 合購方案討論"),
      ],
      next_cursor: null,
      has_more: false,
    });

    const result = await executeNotionTool({
      action: "query",
      databaseId: "db-1",
      search: "合購",
      limit: 20,
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data[0].title).toContain("合購機制調整");
    expect(result.data[1].title).toContain("合購方案討論");
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
  });

  it("title filter is case-insensitive", async () => {
    mockQueryDatabase.mockResolvedValueOnce({
      object: "list",
      results: [
        makePage("p1", "Q1 Report Summary"),
        makePage("p2", "Weekly report"),
        makePage("p3", "Meeting Notes"),
      ],
      next_cursor: null,
      has_more: false,
    });

    const result = await executeNotionTool({
      action: "query",
      databaseId: "db-1",
      search: "report",
      limit: 20,
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data[0].title).toBe("Q1 Report Summary");
    expect(result.data[1].title).toBe("Weekly report");
  });

  it("uses page_size=100 when search filter is provided", async () => {
    mockQueryDatabase.mockResolvedValueOnce({
      object: "list",
      results: [],
      next_cursor: null,
      has_more: false,
    });

    await executeNotionTool({
      action: "query",
      databaseId: "db-1",
      search: "合購",
      limit: 20,
    });

    expect(mockQueryDatabase).toHaveBeenCalledWith("db-1", { page_size: 100 });
  });

  it("uses user-specified limit when no search filter", async () => {
    mockQueryDatabase.mockResolvedValueOnce({
      object: "list",
      results: [],
      next_cursor: null,
      has_more: false,
    });

    await executeNotionTool({
      action: "query",
      databaseId: "db-1",
      limit: 30,
    });

    expect(mockQueryDatabase).toHaveBeenCalledWith("db-1", { page_size: 30 });
  });
});
