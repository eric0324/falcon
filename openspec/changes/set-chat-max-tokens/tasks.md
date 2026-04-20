# Tasks: 主聊天設定 max output tokens

## Task 1: Per-model 預設值
- [x] 在 `src/lib/ai/models.ts` 新增 `MODEL_MAX_OUTPUT_TOKENS: Record<ModelId, number>`
  - claude-opus-47 / claude-opus / claude-sonnet：8192
  - claude-haiku：4096
  - gpt-5-mini / gpt-5-nano：4096
  - gemini-flash / gemini-pro：8192
- [x] 新增 `getDefaultMaxOutputTokens(modelId: ModelId): number`
- [x] 撰寫單元測試（4 tests pass）

## Task 2: 主 streamText 加上限
- [x] 修改主 `streamText()` 加入 `maxOutputTokens: getDefaultMaxOutputTokens(modelName)`
- [x] 修改 final fallback `streamText()` 同樣加上

## Task 3: finishReason 監控
- [x] 主 stream 與 fallback 各自 `await result.finishReason`
- [x] `finishReason === "length"` 時 `console.warn` 記錄 step / model / cap

## Task 4: 測試
- [x] 單元測試：getDefaultMaxOutputTokens 對各 model 回正確值
- [ ] 整合測試：強制長回答可被截斷（待 staging 手動驗證）

## 依賴關係

```
Task 1 ← Task 2 ← Task 3
              ← Task 4
```
