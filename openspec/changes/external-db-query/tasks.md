# Tasks: external-db-query

## Task 1: 查詢執行函數
- [ ] 在 `src/lib/external-db.ts` 新增 `executeQuery(config, sql)` 函數
- [ ] 支援 MySQL 和 PostgreSQL
- [ ] 30 秒逾時、結果限 100 rows

## Task 2: LLM Tools
- [ ] 新增 `src/lib/ai/external-db-tools.ts`
- [ ] 實作 `listTables` tool（含角色過濾）
- [ ] 實作 `getTableSchema` tool（含角色過濾）
- [ ] 實作 `queryDatabase` tool（SQL 驗證 + LIMIT + 執行）

## Task 3: 使用者可存取資料庫 API
- [ ] 新增 `GET /api/external-databases` 回傳使用者可存取的資料庫列表

## Task 4: DataSourceSelector 整合
- [ ] 修改 `data-source-selector.tsx` 新增「外部資料庫」sub menu
- [ ] 呼叫 `/api/external-databases` 取得資料庫列表
- [ ] dataSource ID 格式：`extdb_<databaseId>`

## Task 5: Chat API 整合
- [ ] 修改 `src/app/api/chat/route.ts` 載入 external-db tools
- [ ] 解析 `extdb_` 前綴的 dataSources，取得 databaseId
- [ ] 將 userId 傳遞給 tool 做權限檢查

## Task 6: System Prompt 整合
- [ ] 修改 `src/lib/ai/system-prompt.ts` 新增外部資料庫使用指南
- [ ] 當 dataSources 含有 `extdb_` 時注入指南
