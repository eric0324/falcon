# Tasks: Tool Database

## Task 1: Prisma Model
- [x] 新增 `ToolTable` model（toolId FK, name, columns JSON）
- [x] 新增 `ToolRow` model（tableId FK, data JSON, createdBy）
- [x] Tool model 加 `tables` relation
- [x] `@@unique([toolId, name])` + `@@index([tableId, createdAt])`
- [x] db push

## Task 2: ToolDB Handler
- [x] 建立 `src/lib/bridge/tooldb-handler.ts`
- [x] `normalizeRow()`：根據 columns 做 projection
- [x] Schema actions：createTable, updateSchema, deleteTable, listTables
- [x] Data actions：insert, list, get, update, delete
- [x] 驗證 tableId 屬於 toolId
- [x] 10K row 上限 + 10KB payload 檢查

## Task 3: Bridge 整合
- [x] `handlers.ts` 加 tooldb 路由
- [x] `dispatchBridge` 加 context 參數傳 toolId
- [x] Bridge route：tooldb 視為 platform capability + 傳 toolId
- [x] 操作記錄寫入 DataSourceLog

## Task 4: SDK 注入
- [x] `sandbox-api-client.ts` 加 `window.tooldb` 物件
- [x] PreviewPanel handleMessage 允許 tooldb 呼叫

## Task 5: AI 整合
- [x] `system-prompt.ts` 加 tooldb 說明（英文）

## Task 6: 唯讀 API + 管理頁面
- [x] `GET /api/tools/:id/tables`：列出資料表
- [x] `GET /api/tools/:id/tables/:tableId/rows`：分頁取得資料
- [x] `tool-database-tab.tsx`：資料表列表 + schema + 資料預覽
- [x] 工具詳情頁加入，僅作者可見

## Task 7: 測試
- [x] handler 單元測試（normalizeRow, CRUD, 權限, 上限）
- [x] TypeScript 型別檢查
- [x] 既有測試無 regression
