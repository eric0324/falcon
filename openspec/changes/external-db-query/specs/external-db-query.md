# Spec: external-db-query

## Requirements

### R1: 資料來源選擇
- DataSourceSelector 新增「外部資料庫」分類
- 列出所有外部資料庫（不含 hidden-only 的）
- 使用者選擇後，dataSource ID 格式為 `extdb_<databaseId>`
- 只有已掃描過（lastSyncedAt 非 null）的資料庫才出現

### R2: LLM Tools
提供三個 tools 給 LLM 使用：

**listTables** — 列出選定資料庫的可用資料表
- 輸入：databaseId
- 輸出：table 名稱 + note 列表
- 過濾：hidden = true 的不顯示；根據使用者 companyRoles 過濾

**getTableSchema** — 取得指定資料表的欄位詳情
- 輸入：databaseId, tableName
- 輸出：column 名稱 + dataType + note 列表
- 過濾：根據使用者 companyRoles 過濾欄位

**queryDatabase** — 執行 SQL 查詢
- 輸入：databaseId, sql
- 輸出：查詢結果（JSON rows）
- 限制：只允許 SELECT 語句
- 限制：自動加 LIMIT 100（如果使用者的 SQL 沒有 LIMIT）
- 逾時：30 秒

### R3: System Prompt
- 當使用者選擇外部資料庫時，注入使用指南到 system prompt
- 指引 LLM 先用 listTables 了解可用表，再用 getTableSchema 了解欄位，最後用 queryDatabase 查詢
- 提醒 LLM 參考 table/column 的 note 來理解資料意義

### R4: 安全性
- SQL 查詢只允許 SELECT（拒絕 INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE）
- 查詢結果限制 100 rows
- 連線逾時 30 秒
- 根據使用者的 companyRoles 過濾可見的 table/column
- 無角色的使用者看不到任何 table/column

## Scenarios

### S1: 使用者查詢銷售數據
- Given: 使用者選擇了「營運資料庫」作為資料來源
- When: 使用者問「上個月的銷售總額是多少？」
- Then: LLM 呼叫 listTables → getTableSchema(orders) → queryDatabase(SELECT SUM...)
- Then: LLM 用查詢結果回答使用者

### S2: 使用者無權限看某表
- Given: 使用者角色為「業務」，但 `salaries` 表只允許「財務」角色
- When: LLM 呼叫 listTables
- Then: `salaries` 不出現在列表中

### S3: 危險 SQL 被拒絕
- Given: LLM 嘗試執行 `DROP TABLE users`
- When: queryDatabase 被呼叫
- Then: 回傳錯誤「只允許 SELECT 查詢」

### S4: 無角色使用者
- Given: 使用者未被指派任何 companyRole
- When: LLM 呼叫 listTables
- Then: 回傳空列表
