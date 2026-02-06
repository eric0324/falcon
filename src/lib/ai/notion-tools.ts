import { tool } from "ai";
import { z } from "zod";
import {
  isNotionConfigured,
  queryDatabase,
  getPage,
  getBlockChildrenDeep,
  blocksToText,
  notionSearch,
  NotionDatabase,
  NotionPage,
} from "@/lib/integrations/notion";

/**
 * Extract plain text from Notion rich text array
 */
function extractPlainText(richText: Array<{ plain_text: string }> | undefined): string {
  if (!richText || richText.length === 0) return "";
  return richText.map((t) => t.plain_text).join("");
}

/**
 * Extract property value from Notion page property
 */
function extractPropertyValue(property: Record<string, unknown>): unknown {
  const type = property.type as string;

  switch (type) {
    case "title":
    case "rich_text":
      return extractPlainText(property[type] as Array<{ plain_text: string }>);
    case "number":
      return property.number;
    case "select":
      return (property.select as { name: string } | null)?.name || null;
    case "multi_select":
      return (property.multi_select as Array<{ name: string }>)?.map((s) => s.name) || [];
    case "date":
      return property.date;
    case "checkbox":
      return property.checkbox;
    case "url":
      return property.url;
    case "email":
      return property.email;
    case "status":
      return (property.status as { name: string } | null)?.name || null;
    default:
      return null;
  }
}

/**
 * Transform Notion page to simplified object
 */
function transformPage(page: NotionPage): Record<string, unknown> {
  const result: Record<string, unknown> = {
    id: page.id,
    url: page.url,
  };

  if (page.icon?.type === "emoji") {
    result.icon = page.icon.emoji;
  }

  // Include parent info so AI knows which database this page belongs to
  if (page.parent) {
    result.parentType = page.parent.type;
    if (page.parent.database_id) {
      result.parentDatabaseId = page.parent.database_id;
    }
  }

  for (const [key, value] of Object.entries(page.properties)) {
    result[key] = extractPropertyValue(value as Record<string, unknown>);
  }

  return result;
}

/**
 * Extract just the title from a Notion page's properties
 */
function extractPageTitle(page: NotionPage): string {
  for (const value of Object.values(page.properties)) {
    const prop = value as Record<string, unknown>;
    if (prop.type === "title") {
      return extractPlainText(prop.title as Array<{ plain_text: string }>);
    }
  }
  return "";
}

/**
 * Transform Notion database to simplified object
 */
function transformDatabase(db: NotionDatabase): Record<string, unknown> {
  return {
    id: db.id,
    title: extractPlainText(db.title),
    description: extractPlainText(db.description),
    icon: db.icon?.type === "emoji" ? db.icon.emoji : null,
    url: db.url,
  };
}

/**
 * Create Notion tools for AI
 */
export function createNotionTools() {
  return {
    notionSearch: tool({
      description: `存取 Notion 資料。建議使用順序：list → query/read → read。

操作：
- list：列出所有資料庫和頁面（永遠先做這步，根據名稱判斷哪個相關）
- query：查詢特定資料庫的所有頁面（用 databaseId）
- read：讀取頁面完整正文和子頁面列表（用 pageId）。頁面內的子頁面會顯示 pageId 供進一步讀取
- search：全文搜尋（對中文不準確，只在 list+query 找不到時才用）`,
      inputSchema: z.object({
        action: z.enum(["list", "query", "search", "read"]).optional().describe("list: 列出所有資料庫和頁面, query: 查詢特定資料庫, search: 全文搜尋, read: 讀取頁面完整內容（含正文和子頁面）。預設為 list"),
        databaseId: z.string().optional().describe("資料庫 ID (用於 query)"),
        pageId: z.string().optional().describe("頁面 ID (用於 read 讀取頁面正文)"),
        search: z.string().optional().describe("搜尋關鍵字"),
        limit: z.number().optional().describe("最多返回幾筆結果，預設 20"),
      }),
      execute: async (params) => {
        const { action, databaseId, pageId, search, limit = 20 } = params;

        try {
          // Check if Notion is configured
          if (!isNotionConfigured()) {
            return {
              success: false,
              error: "Notion 尚未設定。請在環境變數中設定 NOTION_TOKEN。",
              needsConnection: true,
              service: "notion",
            };
          }

          // Read page content (properties + blocks)
          if (action === "read" && pageId) {
            const page = await getPage(pageId);
            const pageData = transformPage(page);

            // Fetch page blocks (content)
            try {
              const blocks = await getBlockChildrenDeep(pageId);
              const textContent = blocksToText(blocks);
              pageData.content = textContent || "(此頁面沒有正文內容)";
            } catch {
              pageData.content = "(無法讀取頁面內容)";
            }

            return {
              success: true,
              service: "notion",
              data: pageData,
              rowCount: 1,
            };
          }

          // Legacy: get page properties only (without read action)
          if (pageId && action !== "read") {
            const page = await getPage(pageId);
            return {
              success: true,
              service: "notion",
              data: transformPage(page),
              rowCount: 1,
            };
          }

          // Query specific database - return lightweight list (id + title only)
          if (databaseId) {
            const result = await queryDatabase(databaseId, { page_size: limit });
            const data = result.results.map((page) => ({
              id: page.id,
              title: extractPageTitle(page),
              icon: page.icon?.type === "emoji" ? page.icon.emoji : undefined,
            }));
            return {
              success: true,
              service: "notion",
              data,
              rowCount: data.length,
              metadata: { has_more: result.has_more },
              hint: "用 read(pageId) 讀取感興趣的頁面正文。",
            };
          }

          // Search
          if (search) {
            const result = await notionSearch({ query: search, page_size: limit });
            const data = result.results.map((item) => {
              if ("title" in item) {
                return transformDatabase(item as NotionDatabase);
              }
              return transformPage(item as NotionPage);
            });
            return {
              success: true,
              service: "notion",
              data,
              rowCount: data.length,
              metadata: { has_more: result.has_more },
            };
          }

          // List workspace structure: only top-level databases + standalone pages
          // Returns minimal data (id, title, type) to save tokens
          const result = await notionSearch({ page_size: 100 });
          const seen = new Set<string>();
          const data: Array<{ id: string; title: string; icon?: string; objectType: string }> = [];

          for (const item of result.results) {
            // Database
            if ("title" in item && Array.isArray((item as NotionDatabase).title)) {
              const db = item as NotionDatabase;
              if (seen.has(db.id)) continue;
              seen.add(db.id);
              data.push({
                id: db.id,
                title: extractPlainText(db.title),
                icon: db.icon?.type === "emoji" ? db.icon.emoji : undefined,
                objectType: "database",
              });
              continue;
            }

            // Page: only keep workspace-level or page-child (not database entries)
            const page = item as NotionPage;
            const parentType = page.parent?.type;
            if (parentType !== "workspace" && parentType !== "page_id") continue;
            if (seen.has(page.id)) continue;
            seen.add(page.id);
            data.push({
              id: page.id,
              title: extractPageTitle(page),
              icon: page.icon?.type === "emoji" ? page.icon.emoji : undefined,
              objectType: "page",
            });
          }

          return {
            success: true,
            service: "notion",
            data,
            rowCount: data.length,
            hint: "對資料庫用 query(databaseId)，對頁面用 read(pageId) 查看內容和子頁面。",
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            service: "notion",
          };
        }
      },
    }),
  };
}
