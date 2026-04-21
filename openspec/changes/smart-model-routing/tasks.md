# Tasks: 簡單查詢自動降級到 Haiku

## Task 1: 路由邏輯
- [x] 建立 `src/lib/ai/route-model.ts`
- [x] 實作 `routeModel(input: { userMessage, selectedModel, hasFiles, hasToolHistory }): ModelId`
- [x] 定義 UPGRADE_KEYWORDS（程式類 / 分析類 / 設計類 / 圖片類）
- [x] heuristics：短訊(<200)＋無附件＋無關鍵字＋無工具歷史＋Anthropic 高階 → 降級 Haiku
- [x] 其他情況（含非 Anthropic、已選 haiku）回原 selectedModel
- [x] 撰寫單元測試（19 tests pass）

## Task 2: 整合 Chat API
- [x] 修改 `src/app/api/chat/route.ts`
- [x] 取得 selectedModelName 後呼叫 `routeModel()` 得到 modelName（actual）
- [x] 用 modelName 取 `getModel()` 建立 LanguageModel 實例
- [x] log 記錄降級：`[Chat API] model routed: opus-47 → haiku (short_simple_query)`
- [x] 在 `i:` stream 事件附上 `actualModel` / `selectedModel`（僅在實際降級時）

## Task 3: 前端 Badge
- [x] 修改 `src/app/(app)/chat/page.tsx`
- [x] 解析 stream `i:` 事件中的 `actualModel` / `selectedModel`，存進 routing 區域變數
- [x] 組 assistant message 時加上 `routing` 欄位
- [x] `chat-message.tsx` 新增 `RoutingBadge`，在 assistant 回覆下方顯示「⚡ 自動改用 Haiku」+ tooltip

## Task 4: 計費與統計
- [x] `prisma.tokenUsage.create({ model: modelName, ... })` 的 modelName 已是 actualModel
- [x] `estimateCost(modelName, ...)` 依 actualModel 單價計算

## Task 5: 測試
- [x] 單元測試：routeModel 各 case（19 tests）
- [ ] 手動實測降級 badge 顯示（待 staging 驗證）

## 依賴關係

```
Task 1 ← Task 2 ← Task 3
              ← Task 4
              ← Task 5
```
