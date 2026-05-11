import { tool } from "ai";
import { z } from "zod";
import {
  isNotionConfigured,
  queryDatabase,
  queryDatabaseAll,
  buildTitleContainsFilter,
  getPage,
  getDatabase,
  getBlockChildrenDeep,
  blocksToText,
  notionSearch,
  listDatabases,
  extractProperties,
  extractDatabaseSchema,
  translatePropertyFilter,
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
 * Create Notion tools for AI
 */
export function createNotionTools() {
  return {
    notionSearch: tool({
      description: `存取 Notion 資料。善用平行呼叫同時查資料庫和瀏覽頁面。

操作：
- list：列出所有資料庫和頁面（永遠先做這步）
- searchAll：跨所有資料庫搜尋標題含關鍵字的頁面（找資料優先用這個）
- query：查詢特定資料庫的頁面（用 databaseId）。要找人名／tag／status／日期條件時用 propertyFilter 在 server 端篩；search 只篩標題
- read：讀取頁面完整正文和子頁面（用 pageId），含 properties
- search：全文搜尋（中文不準確，盡量不用）

properties 範例：{ Status: "Done", Tags: ["frontend"], Due: { start: "2026-05-20" }, Owner: ["Alice"] }。Relation 欄位只回 page id 陣列，要看標題請對該 id 再 read。

propertyFilter 例：
- 找狀態 = Done：{ property: "Status", equals: "Done" }
- 找含某 tag：{ property: "Tags", contains: "frontend" }
- 找某人負責：{ property: "Assignee", contains: "<user_id>" }
- 數值區間：{ property: "Estimate", between: { from: 3, to: 8 } }
- 日期：{ property: "Due", before: "2026-06-01" } 或 { property: "Due", past_week: true }
- 是空：{ property: "Owner", is_empty: true }
一次只能帶一個 operator key。`,
      inputSchema: z.object({
        action: z.enum(["list", "searchAll", "query", "search", "read"]).optional().describe("list: 列出所有資料庫和頁面, searchAll: 跨所有資料庫搜尋（推薦）, query: 查詢特定資料庫, search: 全文搜尋, read: 讀取頁面完整內容（含正文和子頁面）。預設為 list"),
        databaseId: z.string().optional().describe("資料庫 ID (用於 query)"),
        pageId: z.string().optional().describe("頁面 ID (用於 read 讀取頁面正文)"),
        search: z.string().optional().describe("搜尋關鍵字（只過濾頁面標題）"),
        propertyFilter: z.object({
          property: z.string().describe("資料庫欄位名（大小寫敏感）"),
          equals: z.union([z.string(), z.number(), z.boolean()]).optional(),
          contains: z.string().optional(),
          is_empty: z.literal(true).optional(),
          is_not_empty: z.literal(true).optional(),
          greater_than: z.number().optional(),
          less_than: z.number().optional(),
          between: z.object({
            from: z.union([z.number(), z.string()]),
            to: z.union([z.number(), z.string()]),
          }).optional(),
          before: z.string().optional(),
          after: z.string().optional(),
          on_or_before: z.string().optional(),
          on_or_after: z.string().optional(),
          past_week: z.literal(true).optional(),
          past_month: z.literal(true).optional(),
          past_year: z.literal(true).optional(),
          next_week: z.literal(true).optional(),
          next_month: z.literal(true).optional(),
          next_year: z.literal(true).optional(),
        }).optional().refine(
          (val) => {
            if (!val) return true;
            const opKeys = Object.keys(val).filter((k) => k !== "property");
            return opKeys.length === 1;
          },
          { message: "propertyFilter 必須恰好帶一個 operator key（例如 equals、contains、before、between 等）" }
        ).describe("在指定欄位上的 server-side 過濾條件，搭配 query 使用"),
        limit: z.number().optional().describe("最多返回幾筆結果，預設 20"),
      }),
      execute: async (params) => {
        const { action, databaseId, pageId, search, propertyFilter, limit = 20 } = params;

        try {
          // Check if Notion is configured
          if (!(await isNotionConfigured())) {
            return {
              success: false,
              error: "Notion 尚未設定。請在環境變數中設定 NOTION_TOKEN。",
              needsConnection: true,
              service: "notion",
            };
          }

          // Read page content (lightweight metadata + full text content)
          if (pageId) {
            const page = await getPage(pageId);
            const pageData: Record<string, unknown> = {
              id: page.id,
              title: extractPageTitle(page),
              icon: page.icon?.type === "emoji" ? page.icon.emoji : undefined,
              properties: extractProperties(page.properties),
            };

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

          // Search across ALL databases AND standalone pages for the keyword
          if (action === "searchAll" && search) {
            const keyword = search.toLowerCase();

            // 1. List all databases
            const databases = await listDatabases();

            // 2. Three parallel searches:
            //    a) Query each database with native title filter
            //    b) Scan standalone/child pages from workspace (title match)
            //    c) Use Notion search API as fallback (may catch some results)
            const dbQueryPromises = databases.map(async (db) => {
              try {
                const filter = buildTitleContainsFilter(search);
                const { results } = await queryDatabaseAll(db.id, { filter }, 10);
                return results.map((page) => ({
                  id: page.id,
                  title: extractPageTitle(page),
                  icon: page.icon?.type === "emoji" ? page.icon.emoji : undefined,
                  source: `📊 ${extractPlainText(db.title)}`,
                }));
              } catch {
                return [];
              }
            });

            const standalonePagePromise = (async () => {
              // Scan workspace pages (up to 3 rounds) and filter by title
              const matched: Array<{ id: string; title: string; icon?: string; source: string }> = [];
              let cursor: string | undefined;
              for (let round = 0; round < 3; round++) {
                const result = await notionSearch({
                  page_size: 100,
                  ...(cursor ? { start_cursor: cursor } : {}),
                });
                for (const item of result.results) {
                  if ("title" in item && Array.isArray((item as NotionDatabase).title)) continue;
                  const page = item as NotionPage;
                  const title = extractPageTitle(page);
                  if (title.toLowerCase().includes(keyword)) {
                    matched.push({
                      id: page.id,
                      title,
                      icon: page.icon?.type === "emoji" ? page.icon.emoji : undefined,
                      source: "📄 獨立頁面",
                    });
                  }
                }
                if (!result.has_more || !result.next_cursor) break;
                cursor = result.next_cursor;
              }
              return matched;
            })();

            const [dbResults, pageResults] = await Promise.all([
              Promise.all(dbQueryPromises).then((r) => r.flat()),
              standalonePagePromise,
            ]);

            // Deduplicate by id
            const seen = new Set<string>();
            const allResults: Array<{ id: string; title: string; icon?: string; source: string }> = [];
            for (const item of [...pageResults, ...dbResults]) {
              if (seen.has(item.id)) continue;
              seen.add(item.id);
              allResults.push(item);
            }

            return {
              success: true,
              service: "notion",
              data: allResults.slice(0, limit),
              rowCount: allResults.length,
              metadata: { databasesSearched: databases.length },
              hint: allResults.length > 0
                ? "用 read(pageId) 讀取感興趣的頁面正文和子頁面。"
                : "找不到結果。試試用 list 瀏覽結構，或用 read 讀取可能相關的頁面查看子頁面。",
            };
          }

          // Query specific database - return id, title, properties per row
          if (databaseId) {
            // Build server-side filter from search and/or propertyFilter
            const clauses: Record<string, unknown>[] = [];
            let titlePropName = "Name";

            if (propertyFilter) {
              const db = await getDatabase(databaseId);
              const schema = extractDatabaseSchema(db);
              titlePropName = schema.titlePropertyName;
              const translated = translatePropertyFilter(propertyFilter, schema);
              if ("error" in translated) {
                return {
                  success: false,
                  service: "notion",
                  error: translated.error,
                  availableProperties: translated.availableProperties,
                };
              }
              clauses.push(translated.filter);
            }

            if (search) {
              clauses.push(buildTitleContainsFilter(search, titlePropName));
            }

            if (clauses.length > 0) {
              const filter = clauses.length === 1 ? clauses[0] : { and: clauses };
              const { results, hasMore } = await queryDatabaseAll(databaseId, { filter }, limit);
              const data = results.slice(0, limit).map((page) => ({
                id: page.id,
                title: extractPageTitle(page),
                icon: page.icon?.type === "emoji" ? page.icon.emoji : undefined,
                properties: extractProperties(page.properties),
              }));
              return {
                success: true,
                service: "notion",
                data,
                rowCount: data.length,
                metadata: { has_more: hasMore || results.length > limit },
                hint: "用 read(pageId) 讀取感興趣的頁面正文。",
              };
            }

            // No filter - just fetch the requested amount
            const result = await queryDatabase(databaseId, { page_size: limit });
            const data = result.results.map((page) => ({
              id: page.id,
              title: extractPageTitle(page),
              icon: page.icon?.type === "emoji" ? page.icon.emoji : undefined,
              properties: extractProperties(page.properties),
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

          // Search - return lightweight results (id + title only) to save tokens
          if (search) {
            const result = await notionSearch({ query: search, page_size: limit });
            const data = result.results.map((item) => {
              if ("title" in item && Array.isArray((item as NotionDatabase).title)) {
                const db = item as NotionDatabase;
                return {
                  id: db.id,
                  title: extractPlainText(db.title),
                  icon: db.icon?.type === "emoji" ? db.icon.emoji : undefined,
                  objectType: "database" as const,
                };
              }
              const page = item as NotionPage;
              return {
                id: page.id,
                title: extractPageTitle(page),
                icon: page.icon?.type === "emoji" ? page.icon.emoji : undefined,
                objectType: "page" as const,
              };
            });
            return {
              success: true,
              service: "notion",
              data,
              rowCount: data.length,
              metadata: { has_more: result.has_more },
              hint: "用 read(pageId) 讀取感興趣的頁面正文。",
            };
          }

          // List workspace structure: all top-level databases + standalone pages
          // Paginates up to 5 rounds (500 raw items) to avoid infinite loops
          const seen = new Set<string>();
          const data: Array<{ id: string; title: string; icon?: string; objectType: string }> = [];
          let cursor: string | undefined;
          const maxRounds = 5;

          for (let round = 0; round < maxRounds; round++) {
            const result = await notionSearch({
              page_size: 100,
              ...(cursor ? { start_cursor: cursor } : {}),
            });

            for (const item of result.results) {
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

            if (!result.has_more || !result.next_cursor) break;
            cursor = result.next_cursor;
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
