# Proposal: 分層 System Prompt 提升三家 Provider 的 Cache 命中率

## Why

上一個 change `enable-prompt-caching` 已啟用 Anthropic 顯式 `cache_control`，但仍有兩個漏點：

1. **整段 system prompt 共用一個 cache breakpoint**：`cacheableSystem()` 把 `buildSystemPrompt()` 組裝出的整段字串包成單一 SystemModelMessage，動態組裝任一處變動（資料源切換、`imageProviderChoice` 改變、`memoryRecall` 注入、`currentToolCode` 更新、`currentTime` 每分鐘變、`skillPrompt` 切換）整段就 cache miss。
2. **三家 provider 共通的「prefix cache」未被照顧**：`src/lib/ai/system-prompt.ts:1080` 在 `BASE_PROMPT` 之後立刻插入 `Current Time`，導致每分鐘整個 prefix 都會變，OpenAI 的自動 prefix cache（≥1024 tokens 命中）與 Gemini 2.5 的 implicit context cache 也都無法吃到折扣。

兩個漏點同時讓「長對話」「多 step tool loop（最多 15 步）」的 token 成本被乘上 N 倍。

## What Changes

把 system prompt 從「單一字串」改為**按穩定度排序的三段**，每段帶不同的 cache 處理策略：

| Segment | 內容 | 變動頻率 | Anthropic | OpenAI / Gemini |
|---|---|---|---|---|
| 1. Core | `BASE_PROMPT` + 永遠開的 Bridge 區塊 (`LLM_BRIDGE` / `SCRAPER_BRIDGE` / `TOOLDB`) | 幾乎不變 | `cache_control: ephemeral` | 自然落在 prefix，命中 implicit cache |
| 2. Capabilities | 依 `dataSources` 的各 INSTRUCTIONS + `companyAPI` 區段 + 依 `imageProviderChoice` 的 image bridge | 同一使用者通常穩定 | `cache_control: ephemeral` | 接在 prefix 之後，同樣命中 |
| 3. Volatile | `Current Time` + `memoryRecall` + `skillPrompt` + `currentToolCode` + `largeToolNotice` + `suggestDataSources` | 每次都可能變 | 不加 breakpoint | 自然 fallthrough，不影響前兩段 cache |

Tools 維持單一 breakpoint 不變。Anthropic 上限 4 個 breakpoint，使用 3 個（Core / Capabilities / tools），留 1 個 budget。

新增 helper：
- `buildLayeredSystemPrompt(opts)` 取代「拼字串再 `cacheableSystem`」流程，回傳結構化三段 + metadata。
- 擴充 `cacheableSystem()` 接受三段輸入，依 provider 輸出對應結構：Anthropic → `content: TextPart[]`、每段獨立 `providerOptions`；OpenAI / Gemini → 單一 concatenated 字串（次序仍按穩定度排）。

監控：log 加上 `segmentTokens={core, capabilities, volatile}`，搭配既有 `cacheReadTokens / cacheCreationTokens` 觀察各段命中表現。

**BREAKING**: 對外無 breaking。`buildSystemPrompt(...)` 舊簽名保留（內部改 delegate 給新 layered builder + concat 回字串）。`cacheableSystem` 既有單字串呼叫保留向後相容。

## Impact

- Affected specs: `studio` (MODIFIED — Prompt Caching；ADDED — Layered System Prompt)
- Affected code:
  - `src/lib/ai/system-prompt.ts`：抽出 layered builder，重排 `Current Time` 到 Volatile 段
  - `src/lib/ai/cache-control.ts`：擴充支援多段 + provider 分支
  - `src/app/api/chat/route.ts:502-526, 671, 840`：改用 layered builder，volatile 注入移到 Segment 3
  - `src/lib/ai/cache-control.test.ts`：新增多段測試
  - 新增 `src/lib/ai/system-prompt.test.ts` 的 ordering 測試（已存在則擴充）
- 預期效果：第 2 輪起 Anthropic `cache_read_input_tokens` 命中**穩定段 + 能力段**而非只命中「字串完全相同」的瞬間；OpenAI/Gemini 在 `Current Time` 不再污染 prefix 後，prefix cache 命中率提升。
