# Tasks: Draft Tool

## Task 1: Prisma — 新增 status 欄位
- [ ] 新增 `ToolStatus` enum（DRAFT, PUBLISHED）
- [ ] Tool model 加 `status ToolStatus @default(DRAFT)`
- [ ] Migration：既有工具全部設為 PUBLISHED
- [ ] 加 `@@index([status])` 方便查詢

## Task 2: 草稿 API
- [ ] 新增 `POST /api/tools/draft`：建立草稿（code, conversationId）
- [ ] 回傳 toolId
- [ ] 同一個 conversationId 只能有一個草稿（若已存在則更新 code）

## Task 3: Chat Page — 自動建立草稿
- [ ] `updateCode` result 觸發時，呼叫草稿 API
- [ ] 拿到 toolId 存入 state
- [ ] 後續 updateCode 用 PATCH 更新同一個草稿的 code
- [ ] 編輯已發布工具時跳過建立草稿

## Task 4: ToolRunner — 傳入 toolId
- [ ] Chat page 把草稿 toolId 傳給 ToolRunner
- [ ] Bridge 呼叫同時帶 toolId 和 dataSources（DRAFT 用 dataSources 驗證權限，但也傳 toolId）

## Task 5: DeployDialog — 改為「發布」
- [ ] 建立草稿時不再 POST /api/tools（改用 PATCH）
- [ ] PATCH 時更新 metadata + status → PUBLISHED
- [ ] UI 文字從「部署」改為「發布」

## Task 6: 排除 DRAFT
- [ ] Marketplace 查詢加 `status: PUBLISHED` filter
- [ ] 公開工具頁檢查 status，DRAFT 回 404
- [ ] 工具搜尋排除 DRAFT
- [ ] buildVisibilityFilter 加 status 條件

## Task 7: 測試
- [ ] 草稿 API 測試（建立、重複建立、更新 code）
- [ ] 發布流程測試（DRAFT → PUBLISHED）
- [ ] Marketplace 不顯示 DRAFT 測試
