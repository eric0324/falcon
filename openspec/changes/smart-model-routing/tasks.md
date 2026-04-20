# Tasks: 簡單查詢自動降級到 Haiku

## Task 1: 路由邏輯
- [ ] 建立 `src/lib/ai/route-model.ts`
- [ ] 實作 `routeModel(input: { userMessage, files, selectedModel, hasToolHistory }): ModelId`
- [ ] 定義 keyword list（程式類 / 分析類 / 設計類）
- [ ] heuristics：短訊 + 無附件 + 無關鍵字 + Anthropic 高階 → 降級 Haiku
- [ ] 其他情況回原 selectedModel
- [ ] 撰寫單元測試（至少 15 case：各種關鍵字、長度、附件組合）

## Task 2: 整合 Chat API
- [ ] 修改 `src/app/api/chat/route.ts`
- [ ] 取得 selectedModel 後呼叫 `routeModel()` 取得 actualModel
- [ ] 用 actualModel 取 getModel()
- [ ] log 記錄降級：`[Chat API] model routed: opus → haiku (reason: short_query)`
- [ ] 在 `i:` stream 事件附上 `actualModel` 欄位

## Task 3: 前端 Badge
- [ ] 修改 `src/app/(app)/chat/page.tsx`
- [ ] 解析 stream `i:` 事件中的 `actualModel`
- [ ] 若 `actualModel !== selectedModel`，在該則回應上顯示小 badge
  - 例如：「⚡ Haiku (自動最佳化)」
  - tooltip：「此訊息用 Haiku 回應以節省資源；下一則會重新評估」
- [ ] 點 badge 可連到設定或重新以 selectedModel 發問（optional）

## Task 4: 計費與統計
- [ ] 確認 usage log 記錄的是 actualModel（而非 selectedModel）
- [ ] 計費依 actualModel 單價

## Task 5: 測試
- [ ] 單元測試：routeModel 各 case
- [ ] 整合測試：模擬 Opus + 短訊 → 實際用 Haiku
- [ ] 手動實測：確認降級 badge 顯示正確

## 依賴關係

```
Task 1 ← Task 2 ← Task 3
              ← Task 4
              ← Task 5
```
