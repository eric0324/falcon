const NOTION_API_VERSION = "2022-06-28";
const NOTION_BASE_URL = "https://api.notion.com/v1";

export interface NotionDatabase {
  id: string;
  title: Array<{ plain_text: string }>;
  description: Array<{ plain_text: string }>;
  icon?: { type: string; emoji?: string };
  url: string;
}

export interface NotionPage {
  id: string;
  url: string;
  icon?: { type: string; emoji?: string };
  parent: { type: string; database_id?: string; page_id?: string };
  properties: Record<string, unknown>;
}

export interface NotionSearchResult {
  object: "list";
  results: Array<NotionDatabase | NotionPage>;
  next_cursor: string | null;
  has_more: boolean;
}

export interface NotionQueryResult {
  object: "list";
  results: NotionPage[];
  next_cursor: string | null;
  has_more: boolean;
}

/**
 * Check if Notion is configured
 */
export function isNotionConfigured(): boolean {
  return !!process.env.NOTION_TOKEN;
}

/**
 * Get Notion token from environment
 */
function getToken(): string {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    throw new Error("NOTION_TOKEN is not configured");
  }
  return token;
}

/**
 * Make authenticated request to Notion API
 */
async function notionFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const url = `${NOTION_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_API_VERSION,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Notion API error: ${response.status} ${error.message || response.statusText}`
    );
  }

  return response.json();
}

/**
 * Search for pages and databases
 */
export async function notionSearch(params: {
  query?: string;
  filter?: { property: "object"; value: "page" | "database" };
  page_size?: number;
}): Promise<NotionSearchResult> {
  return notionFetch<NotionSearchResult>("/search", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/**
 * List all databases
 */
export async function listDatabases(): Promise<NotionDatabase[]> {
  const result = await notionSearch({
    filter: { property: "object", value: "database" },
    page_size: 100,
  });
  return result.results as NotionDatabase[];
}

/**
 * Query a database
 */
export async function queryDatabase(
  databaseId: string,
  params: {
    filter?: Record<string, unknown>;
    sorts?: Array<{ property: string; direction: "ascending" | "descending" }>;
    page_size?: number;
  } = {}
): Promise<NotionQueryResult> {
  return notionFetch<NotionQueryResult>(`/databases/${databaseId}/query`, {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/**
 * Get a page by ID
 */
export async function getPage(pageId: string): Promise<NotionPage> {
  return notionFetch<NotionPage>(`/pages/${pageId}`);
}

/**
 * Create a page in a database
 */
export async function createPage(params: {
  parent: { database_id: string };
  properties: Record<string, unknown>;
}): Promise<NotionPage> {
  return notionFetch<NotionPage>("/pages", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/**
 * Update a page
 */
export async function updatePage(
  pageId: string,
  properties: Record<string, unknown>
): Promise<NotionPage> {
  return notionFetch<NotionPage>(`/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify({ properties }),
  });
}

export interface NotionBlockResult {
  object: "list";
  results: Array<Record<string, unknown>>;
  next_cursor: string | null;
  has_more: boolean;
}

/**
 * Get block children (page content)
 */
export async function getBlockChildren(
  blockId: string,
  pageSize: number = 100
): Promise<NotionBlockResult> {
  return notionFetch<NotionBlockResult>(
    `/blocks/${blockId}/children?page_size=${pageSize}`,
    { method: "GET" }
  );
}

/**
 * Container block types whose children should be fetched recursively
 */
const CONTAINER_TYPES = new Set(["column_list", "column", "toggle", "synced_block"]);

/**
 * Recursively get block children, expanding container blocks (columns, toggles, etc.)
 */
export async function getBlockChildrenDeep(
  blockId: string,
  maxDepth: number = 2
): Promise<Array<Record<string, unknown>>> {
  const result = await getBlockChildren(blockId);
  const allBlocks: Array<Record<string, unknown>> = [];

  for (const block of result.results) {
    allBlocks.push(block);

    const type = block.type as string;
    const hasChildren = block.has_children as boolean;
    if (hasChildren && CONTAINER_TYPES.has(type) && maxDepth > 0) {
      const children = await getBlockChildrenDeep(block.id as string, maxDepth - 1);
      allBlocks.push(...children);
    }
  }

  return allBlocks;
}

/**
 * Extract rich_text plain text from a block's content field
 */
function extractRichText(richText: Array<{ plain_text: string }> | undefined): string {
  if (!richText || richText.length === 0) return "";
  return richText.map((t) => t.plain_text).join("");
}

/**
 * Convert Notion blocks to readable plain text
 */
export function blocksToText(blocks: Array<Record<string, unknown>>): string {
  if (blocks.length === 0) return "";

  const lines: string[] = [];
  let numberedIndex = 0;

  for (const block of blocks) {
    const type = block.type as string;
    const content = block[type] as Record<string, unknown> | undefined;

    if (!content && type !== "divider") continue;

    const richText = content?.rich_text as Array<{ plain_text: string }> | undefined;
    const text = extractRichText(richText);

    switch (type) {
      case "paragraph":
        lines.push(text);
        numberedIndex = 0;
        break;
      case "heading_1":
        lines.push(`# ${text}`);
        numberedIndex = 0;
        break;
      case "heading_2":
        lines.push(`## ${text}`);
        numberedIndex = 0;
        break;
      case "heading_3":
        lines.push(`### ${text}`);
        numberedIndex = 0;
        break;
      case "bulleted_list_item":
        lines.push(`- ${text}`);
        break;
      case "numbered_list_item":
        numberedIndex++;
        lines.push(`${numberedIndex}. ${text}`);
        break;
      case "to_do": {
        const checked = (content as Record<string, unknown>)?.checked;
        lines.push(`[${checked ? "x" : " "}] ${text}`);
        break;
      }
      case "toggle":
        lines.push(text);
        break;
      case "code":
        lines.push(`\`\`\`\n${text}\n\`\`\``);
        break;
      case "callout":
        lines.push(text);
        break;
      case "quote":
        lines.push(`> ${text}`);
        break;
      case "child_page": {
        const childPageTitle = (content as Record<string, unknown>)?.title as string || "";
        lines.push(`[子頁面: ${childPageTitle}] (pageId: ${block.id})`);
        break;
      }
      case "child_database": {
        const childDbTitle = (content as Record<string, unknown>)?.title as string || "";
        lines.push(`[子資料庫: ${childDbTitle}] (databaseId: ${block.id})`);
        break;
      }
      case "link_to_page": {
        const linkType = (content as Record<string, unknown>)?.type as string;
        const linkedId = (content as Record<string, unknown>)?.[linkType] as string || "";
        if (linkType === "page_id") {
          lines.push(`[連結頁面] (pageId: ${linkedId})`);
        } else if (linkType === "database_id") {
          lines.push(`[連結資料庫] (databaseId: ${linkedId})`);
        }
        break;
      }
      case "divider":
        lines.push("---");
        numberedIndex = 0;
        break;
      default:
        // Skip unsupported blocks (image, embed, etc.)
        break;
    }
  }

  return lines.join("\n");
}
