import { describe, it, expect, vi, beforeEach } from "vitest";
import { getBlockChildren, getBlockChildrenDeep, blocksToText } from "./client";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NOTION_TOKEN", "test-token");
});

describe("getBlockChildren", () => {
  it("fetches block children from Notion API", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          object: "list",
          results: [
            {
              id: "block-1",
              type: "paragraph",
              paragraph: {
                rich_text: [{ plain_text: "Hello world" }],
              },
              has_children: false,
            },
          ],
          next_cursor: null,
          has_more: false,
        }),
    });

    const result = await getBlockChildren("page-id");

    expect(result.results).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/blocks/page-id/children"),
      expect.objectContaining({ method: "GET" })
    );
  });

  it("passes page_size parameter", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          object: "list",
          results: [],
          next_cursor: null,
          has_more: false,
        }),
    });

    await getBlockChildren("page-id", 50);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("page_size=50"),
      expect.any(Object)
    );
  });
});

describe("getBlockChildrenDeep", () => {
  it("recursively fetches children of container blocks", async () => {
    // First call: top-level blocks (column_list with children)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          object: "list",
          results: [
            {
              id: "col-list-1",
              type: "column_list",
              column_list: {},
              has_children: true,
            },
          ],
          next_cursor: null,
          has_more: false,
        }),
    });
    // Second call: column_list children (columns)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          object: "list",
          results: [
            {
              id: "col-1",
              type: "column",
              column: {},
              has_children: true,
            },
          ],
          next_cursor: null,
          has_more: false,
        }),
    });
    // Third call: column children (actual content)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          object: "list",
          results: [
            {
              id: "child-page-1",
              type: "child_page",
              child_page: { title: "請假制度" },
              has_children: false,
            },
          ],
          next_cursor: null,
          has_more: false,
        }),
    });

    const blocks = await getBlockChildrenDeep("page-id");

    // Should contain all 3 levels: column_list, column, child_page
    expect(blocks).toHaveLength(3);
    expect(blocks[0].type).toBe("column_list");
    expect(blocks[1].type).toBe("column");
    expect(blocks[2].type).toBe("child_page");
  });

  it("does not recurse into non-container blocks", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          object: "list",
          results: [
            {
              id: "para-1",
              type: "paragraph",
              paragraph: { rich_text: [{ plain_text: "Hello" }] },
              has_children: true, // has children but not a container type
            },
          ],
          next_cursor: null,
          has_more: false,
        }),
    });

    const blocks = await getBlockChildrenDeep("page-id");

    expect(blocks).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledTimes(1); // no recursive call
  });
});

describe("blocksToText", () => {
  it("extracts text from paragraph blocks", () => {
    const blocks = [
      {
        type: "paragraph",
        paragraph: { rich_text: [{ plain_text: "第一段" }] },
      },
      {
        type: "paragraph",
        paragraph: { rich_text: [{ plain_text: "第二段" }] },
      },
    ];

    const text = blocksToText(blocks);
    expect(text).toContain("第一段");
    expect(text).toContain("第二段");
  });

  it("extracts text from heading blocks", () => {
    const blocks = [
      {
        type: "heading_1",
        heading_1: { rich_text: [{ plain_text: "大標題" }] },
      },
      {
        type: "heading_2",
        heading_2: { rich_text: [{ plain_text: "中標題" }] },
      },
      {
        type: "heading_3",
        heading_3: { rich_text: [{ plain_text: "小標題" }] },
      },
    ];

    const text = blocksToText(blocks);
    expect(text).toContain("# 大標題");
    expect(text).toContain("## 中標題");
    expect(text).toContain("### 小標題");
  });

  it("extracts text from bulleted and numbered list items", () => {
    const blocks = [
      {
        type: "bulleted_list_item",
        bulleted_list_item: { rich_text: [{ plain_text: "項目一" }] },
      },
      {
        type: "numbered_list_item",
        numbered_list_item: { rich_text: [{ plain_text: "第一步" }] },
      },
    ];

    const text = blocksToText(blocks);
    expect(text).toContain("- 項目一");
    expect(text).toContain("1. 第一步");
  });

  it("extracts text from to_do blocks", () => {
    const blocks = [
      {
        type: "to_do",
        to_do: {
          rich_text: [{ plain_text: "待辦事項" }],
          checked: false,
        },
      },
      {
        type: "to_do",
        to_do: {
          rich_text: [{ plain_text: "已完成" }],
          checked: true,
        },
      },
    ];

    const text = blocksToText(blocks);
    expect(text).toContain("[ ] 待辦事項");
    expect(text).toContain("[x] 已完成");
  });

  it("extracts text from toggle blocks", () => {
    const blocks = [
      {
        type: "toggle",
        toggle: { rich_text: [{ plain_text: "展開內容" }] },
      },
    ];

    const text = blocksToText(blocks);
    expect(text).toContain("展開內容");
  });

  it("extracts text from code blocks", () => {
    const blocks = [
      {
        type: "code",
        code: {
          rich_text: [{ plain_text: "console.log('hi')" }],
          language: "javascript",
        },
      },
    ];

    const text = blocksToText(blocks);
    expect(text).toContain("console.log('hi')");
  });

  it("extracts text from callout and quote blocks", () => {
    const blocks = [
      {
        type: "callout",
        callout: { rich_text: [{ plain_text: "注意事項" }] },
      },
      {
        type: "quote",
        quote: { rich_text: [{ plain_text: "引用文字" }] },
      },
    ];

    const text = blocksToText(blocks);
    expect(text).toContain("注意事項");
    expect(text).toContain("> 引用文字");
  });

  it("handles divider blocks", () => {
    const blocks = [
      {
        type: "paragraph",
        paragraph: { rich_text: [{ plain_text: "上面" }] },
      },
      { type: "divider", divider: {} },
      {
        type: "paragraph",
        paragraph: { rich_text: [{ plain_text: "下面" }] },
      },
    ];

    const text = blocksToText(blocks);
    expect(text).toContain("---");
  });

  it("returns empty string for empty blocks array", () => {
    expect(blocksToText([])).toBe("");
  });

  it("extracts child_page blocks with title and id", () => {
    const blocks = [
      {
        id: "child-page-id-123",
        type: "child_page",
        child_page: { title: "彈性工時出勤、請假、加班制度" },
      },
    ];

    const text = blocksToText(blocks);
    expect(text).toContain("[子頁面: 彈性工時出勤、請假、加班制度]");
    expect(text).toContain("pageId: child-page-id-123");
  });

  it("extracts child_database blocks with title and id", () => {
    const blocks = [
      {
        id: "child-db-id-456",
        type: "child_database",
        child_database: { title: "員工名冊" },
      },
    ];

    const text = blocksToText(blocks);
    expect(text).toContain("[子資料庫: 員工名冊]");
    expect(text).toContain("databaseId: child-db-id-456");
  });

  it("extracts link_to_page blocks", () => {
    const blocks = [
      {
        type: "link_to_page",
        link_to_page: { type: "page_id", page_id: "linked-page-123" },
      },
      {
        type: "link_to_page",
        link_to_page: { type: "database_id", database_id: "linked-db-456" },
      },
    ];

    const text = blocksToText(blocks);
    expect(text).toContain("[連結頁面] (pageId: linked-page-123)");
    expect(text).toContain("[連結資料庫] (databaseId: linked-db-456)");
  });

  it("skips unsupported block types gracefully", () => {
    const blocks = [
      { type: "image", image: {} },
      {
        type: "paragraph",
        paragraph: { rich_text: [{ plain_text: "可讀文字" }] },
      },
    ];

    const text = blocksToText(blocks);
    expect(text).toContain("可讀文字");
    // Should not throw
  });
});
