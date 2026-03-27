# Tasks: Tool Database

## Task 1: Prisma Model
- [ ] 新增 `ToolTable` model（toolId FK, name, columns JSON）
- [ ] 新增 `ToolRow` model（tableId FK, data JSON, createdBy）
- [ ] Tool model 加 `tables` relation
- [ ] `@@unique([toolId, name])` + `@@index([tableId, createdAt])`
- [ ] db push

## Task 2: ToolDB Handler
- [ ] 建立 `src/lib/bridge/tooldb-handler.ts`
- [ ] `normalizeRow()`：根據 columns 做 projection
- [ ] Schema actions：createTable, updateSchema, deleteTable, listTables
- [ ] Data actions：insert, list, get, update, delete
- [ ] 驗證 tableId 屬於 toolId
- [ ] 10K row 上限 + 10KB payload 檢查

## Task 3: Bridge 整合
- [ ] `handlers.ts` 加 tooldb 路由
- [ ] `dispatchBridge` 加 context 參數傳 toolId
- [ ] Bridge route：tooldb 視為 platform capability + 傳 toolId
- [ ] 操作記錄寫入 DataSourceLog

## Task 4: SDK 注入
- [ ] `sandbox-api-client.ts` 加 `window.tooldb` 物件
- [ ] PreviewPanel handleMessage 允許 tooldb 呼叫

## Task 5: AI 整合
- [ ] `system-prompt.ts` 加 tooldb 說明（英文）

## Task 6: 唯讀 API + 管理頁面
- [ ] `GET /api/tools/:id/tables`：列出資料表
- [ ] `GET /api/tools/:id/tables/:tableId/rows`：分頁取得資料
- [ ] `tool-database-tab.tsx`：資料表列表 + schema + 資料預覽
- [ ] 工具詳情頁加入，僅作者可見

## Task 7: 測試
- [ ] handler 單元測試（normalizeRow, CRUD, 權限, 上限）
- [ ] TypeScript 型別檢查
- [ ] 既有測試無 regression
