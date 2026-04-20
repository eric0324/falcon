# Tasks: 主聊天設定 max output tokens

## Task 1: Per-model 預設值
- [ ] 在 `src/lib/ai/models.ts` 新增 `MODEL_MAX_OUTPUT_TOKENS: Record<ModelId, number>`
  - claude-opus-47 / claude-opus / claude-sonnet：8192
  - claude-haiku：4096
  - gpt-5-mini / gpt-5-nano：4096
  - gemini-flash / gemini-pro：8192
- [ ] 新增 `getDefaultMaxOutputTokens(modelId: ModelId): number`
- [ ] 撰寫單元測試

## Task 2: 主 streamText 加上限
- [ ] 修改 `src/app/api/chat/route.ts:451`
- [ ] 加入 `maxOutputTokens: getDefaultMaxOutputTokens(modelName)`
- [ ] 修改 route.ts:588 的 final fallback streamText 同樣加上

## Task 3: finishReason 監控
- [ ] 在 stream loop 結束後 `await result.finishReason`
- [ ] log 中記錄 `[Chat API] step=N finishReason=length` 等資訊
- [ ] 方便後續觀察是否需要調整上限

## Task 4: 測試
- [ ] 單元測試：getDefaultMaxOutputTokens 對各 model 回正確值
- [ ] 整合測試：強制長回答可被截斷

## 依賴關係

```
Task 1 ← Task 2 ← Task 3
              ← Task 4
```
