# Tasks: Draft Tool

## Task 1: Prisma — 新增 status 欄位
- [x] 新增 `ToolStatus` enum（DRAFT, PUBLISHED）
- [x] Tool model 加 `status ToolStatus @default(DRAFT)`
- [x] Migration：既有工具全部設為 PUBLISHED
- [x] 加 `@@index([status])` 方便查詢

## Task 2: 草稿 API
- [x] 新增 `POST /api/tools/draft`：建立草稿（code, conversationId）
- [x] 回傳 toolId
- [x] 同一個 conversationId 只能有一個草稿（若已存在則更新 code）

## Task 3: Chat Page — 自動建立草稿
- [x] `updateCode` result 觸發時，呼叫草稿 API
- [x] 拿到 toolId 存入 state
- [x] 後續 updateCode 用 PATCH 更新同一個草稿的 code
- [x] 編輯已發布工具時跳過建立草稿

## Task 4: ToolRunner — 傳入 toolId
- [x] Chat page 把草稿 toolId 傳給 PreviewPanel
- [x] Bridge 呼叫有 toolId 時用 toolId 模式

## Task 5: DeployDialog — 改為「發布」
- [x] 有 draftToolId 時用 PATCH 而非 POST
- [x] PATCH 時帶 status: "PUBLISHED"
- [x] UI 文字從「部署」改為「發布」

## Task 6: 排除 DRAFT
- [x] buildVisibilityFilter 加 status: "PUBLISHED" 條件
- [x] canUserAccessTool DRAFT 只有作者能看
- [x] 公開工具頁檢查 status，DRAFT 回 404

## Task 7: 測試
- [x] TypeScript 型別檢查通過
- [x] 既有測試全部通過（無 regression）
