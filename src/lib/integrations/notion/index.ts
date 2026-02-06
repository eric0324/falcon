export {
  isNotionConfigured,
  notionSearch,
  listDatabases,
  queryDatabase,
  getPage,
  getBlockChildren,
  getBlockChildrenDeep,
  blocksToText,
  createPage,
  updatePage,
} from "./client";

export type {
  NotionDatabase,
  NotionPage,
  NotionSearchResult,
  NotionQueryResult,
  NotionBlockResult,
} from "./client";
