# Proposal: Tool Database

## Change ID
`tool-database`

## Summary
讓每個工具可以擁有自己的資料表，透過 Bridge API 進行 CRUD 操作，使工具從無狀態變成有狀態的小應用。

## Motivation
目前工具是完全無狀態的 — 每次執行都是全新的，無法儲存任何資料。加入工具資料庫後，工具就能持久化資料，實現表單收集、記錄管理、簡易 CRUD 應用等場景。

## Prerequisites
- `draft-tool` change 已完成：AI 產生 code 時自動建立草稿，toolId 在開發階段即可用

## Scope

### In Scope
- 新增 `ToolTable` 和 `ToolRow` 兩個 Prisma model
- Bridge 新增 `tooldb` handler，支援 CRUD + schema 管理
- Schema 定義：欄位名稱 + 型別（text, number, date, boolean, select）
- Schema-on-read：讀取時根據目前 schema 做 normalize
- 資料量限制（每表上限 10,000 筆、單筆 10KB）
- 所有操作走 DataSourceLog 記錄
- ToolRunner iframe 注入 `window.tooldb` SDK
- System prompt 加入 tooldb 使用說明
- 管理頁面（唯讀）：工具詳情頁顯示資料表 schema 和資料預覽

### Out of Scope
- 跨工具資料共享
- 關聯式查詢（JOIN）
- 資料匯出 / 匯入

## Approach

### 資料模型
`ToolTable` 儲存欄位定義（JSON），`ToolRow` 儲存每列資料（JSON）。Schema 變更時不 migrate 既有資料，讀取時做 projection。

### Bridge 整合
`tooldb` 是 platform capability（同 `llm`），不需要在 dataSources 列出。handler 驗證 tableId 屬於 toolId。因為 draft-tool 機制，預覽階段已有 toolId，不需要特殊處理。

### 權限
- handler 驗證 tableId 屬於 toolId，防止跨工具存取
- 所有能存取該工具的使用者都能讀寫資料
- 操作記錄寫入 DataSourceLog

## Risks
- 資料量：熱門工具可能產生大量資料，靠 row 上限控制
- 效能：JSON 欄位查詢在 application layer 做 filter，< 10K rows 足夠
