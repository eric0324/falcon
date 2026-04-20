# Tasks: 啟用 Anthropic Prompt Caching

## Task 1: Provider 判斷 helper
- [x] 在 `src/lib/ai/models.ts` 新增 `isAnthropicModel(modelId: ModelId): boolean`
- [x] 或改為 `getModelProvider(modelId): "anthropic" | "openai" | "google"`
- [x] 撰寫單元測試（各 provider 至少 1 個 case）

## Task 2: Cache Control 封裝
- [x] 建立 `src/lib/ai/cache-control.ts`
- [x] 實作 `cacheableSystem(text, modelId)`：對 Anthropic 回 `{ role:"system", content, providerOptions:{anthropic:{cacheControl:{type:"ephemeral"}}} }`，非 Anthropic 回原字串
- [x] 實作 `cacheableTools(tools, modelId)`：對 Anthropic 在最後一個 tool 加 cacheControl，非 Anthropic 原樣回傳
- [x] 撰寫單元測試（7 tests pass）

## Task 3: System Prompt 快取
- [x] 修改 `src/app/api/chat/route.ts` 的 `streamText()` 呼叫
- [x] `system` 改為以 `cacheableSystem(systemPrompt, modelName)` 包裝
- [x] 確認 Vercel AI SDK v6 透過 SystemModelMessage 的 providerOptions 帶 cacheControl
- [ ] 本地實測：第 2 輪 usage 出現 `cache_read_input_tokens > 0`（待 staging 驗證）

## Task 4: Tools 快取
- [x] 在主 `streamText()` 呼叫，對 tools 物件套用 `cacheableTools()`
- [x] 確認 SDK 透過個別 tool 的 providerOptions 取 cacheControl
- [ ] 本地實測確認 tools 部分進入快取（待 staging 驗證）

## Task 5: Compact fallback 路徑快取
- [x] `src/app/api/chat/route.ts` 的 final fallback `streamText`（無 tools）system 也套用 `cacheableSystem`
- [x] 注意附加 prompt 一起進快取（fallback 罕觸發，分段價值低）

## Task 6: 成本統計更新
- [x] 修改 `src/lib/ai/models.ts` 的 `estimateCost()`
- [x] 新增 `cache?: { cacheReadTokens?, cacheWriteTokens? }` 參數
- [x] 引入 `CACHE_MULTIPLIERS` per-provider 表：anthropic 0.1/1.25、openai 0.5/0、google 0.25/0
- [x] route.ts 從 `usage.inputTokenDetails` 讀出 cacheRead / cacheWrite（三家共用 SDK 正規化欄位）
- [x] route.ts 算 cost 時把 totalInputTokens 拆成 nonCachedInput + cacheRead + cacheWrite，避免重複計費
- [x] 單元測試驗證 Anthropic / OpenAI / Gemini 各自折扣公式（10 個 case pass）

## Task 7: 監控 log
- [x] `[Chat API] tokens model=... input=N (noCache=N, cacheRead=N, cacheWrite=N) output=N cost=$N` log
- [x] 方便後續實測 cache hit rate

## Task 8: 文件
- [x] 評估更新 `openspec/AGENTS.md`：該檔主要為 change workflow 指引，不需加架構細節（spec 已寫入 `specs/studio/spec.md`）
- [x] Changelog 記錄（v0.27.1 showDialog=false）

## 依賴關係

```
Task 1 ← Task 2 ← Task 3, Task 4, Task 5
              ← Task 6
              ← Task 7
```

- Task 1、2 必須先做
- Task 3-5 可平行
- Task 6 依賴 Task 2（需要知道 provider）
- Task 7、8 最後
