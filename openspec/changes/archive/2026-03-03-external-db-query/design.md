# Design: external-db-query

## Architecture

### 新增檔案

```
src/lib/ai/external-db-tools.ts    — LLM tool 定義（listTables, getTableSchema, queryDatabase）
src/app/api/integrations/status/route.ts — 修改：回傳外部資料庫列表
```

### 修改檔案

```
src/components/data-source-selector.tsx  — 新增「外部資料庫」分類
src/app/api/chat/route.ts               — 載入 external-db tools
src/lib/ai/system-prompt.ts             — 注入外部資料庫使用指南
```

### LLM Tools 設計

三個 tools，都接收 userId 做權限過濾（從 session 取得，不由 LLM 提供）：

```typescript
// Tool 1: listTables
tool({
  description: "列出外部資料庫中你可以查詢的資料表",
  inputSchema: z.object({
    databaseId: z.string(),
  }),
  execute: async ({ databaseId }) => {
    // 1. 查 user 的 companyRoles
    // 2. 查 ExternalDatabaseTable where databaseId, hidden=false
    // 3. 過濾：table.allowedRoles 包含 user 任一 role
    // 4. 回傳 tableName + note
  },
})

// Tool 2: getTableSchema
tool({
  description: "取得資料表的欄位定義",
  inputSchema: z.object({
    databaseId: z.string(),
    tableName: z.string(),
  }),
  execute: async ({ databaseId, tableName }) => {
    // 1. 確認 table 存在且使用者有權限
    // 2. 查 columns，過濾 allowedRoles
    // 3. 回傳 columnName + dataType + note
  },
})

// Tool 3: queryDatabase
tool({
  description: "對外部資料庫執行 SQL 查詢（僅支援 SELECT）",
  inputSchema: z.object({
    databaseId: z.string(),
    sql: z.string(),
  }),
  execute: async ({ databaseId, sql }) => {
    // 1. 驗證只有 SELECT
    // 2. 自動加 LIMIT 100
    // 3. 用 external-db.ts 的連線方式執行
    // 4. 回傳 rows (JSON)
  },
})
```

### 查詢執行

在 `src/lib/external-db.ts` 新增 `executeQuery(config, sql)` 函數：
- MySQL: `conn.query(sql)` 回傳 rows
- PostgreSQL: `client.query(sql)` 回傳 rows
- 逾時 30 秒
- 結果截斷：超過 100 rows 只取前 100

### DataSourceSelector 整合

- 新增 API `GET /api/external-databases` 回傳使用者可存取的資料庫列表（根據 companyRoles 過濾）
- DataSourceSelector 新增「外部資料庫」sub menu
- 每個資料庫一個 toggle，選中後 dataSource ID = `extdb_<id>`

### System Prompt 整合

當 dataSources 含有 `extdb_` 前綴的項目時，注入：

```
## 外部資料庫查詢

你可以查詢使用者授權的外部資料庫。請按以下步驟：
1. 先用 listTables 查看可用的資料表和說明
2. 用 getTableSchema 了解需要的資料表欄位結構
3. 根據欄位資訊組合 SQL（僅 SELECT）
4. 用 queryDatabase 執行查詢
5. 分析結果回答使用者的問題

注意：
- 參考 table 和 column 的備註（note）來理解資料意義
- 只能用 SELECT 語句
- 查詢結果最多 100 筆
```

### 安全措施

1. **SQL 白名單驗證**：只允許以 SELECT/WITH 開頭的語句
2. **LIMIT 注入**：解析 SQL，如果沒有 LIMIT 就自動加 `LIMIT 100`
3. **權限過濾**：所有 tool 都根據 user.companyRoles 過濾
4. **連線逾時**：30 秒
5. **結果大小限制**：截斷超長的 cell 值（>500 字元）

## Trade-offs

1. **Tool 粒度**
   - 選擇：3 個獨立 tool（listTables → getTableSchema → queryDatabase）
   - 原因：讓 LLM 漸進式了解 schema，避免一次注入過多 context

2. **Schema 注入 vs Tool 查詢**
   - 選擇：LLM 主動呼叫 tool 查 schema，不直接注入所有 table/column
   - 原因：資料庫可能有幾十張表幾百個欄位，全部注入 system prompt 浪費 token

3. **SQL 安全**
   - 選擇：白名單驗證 + LIMIT 限制
   - 原因：簡單有效，最佳建議是資料庫帳號本身只有 SELECT 權限
