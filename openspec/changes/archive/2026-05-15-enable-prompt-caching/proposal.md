# Proposal: 啟用 Anthropic Prompt Caching

## 概述

啟用三家 provider 的 prompt caching 折扣：
- **Anthropic**：顯式 `cache_control: { type: "ephemeral" }`，標記 system prompt 與 tools。重複輪次只付 0.1x input 價（write 1.25x）
- **OpenAI**：自動 caching，prompt ≥ 1024 tokens 時 SDK 自動命中，cached input 0.5x 計價
- **Google Gemini**：implicit caching（Gemini 2.5 系列預設啟用），cached input 0.25x 計價

三家都把 cache 折扣帶進 `estimateCost`，避免高估費用；Anthropic 部分另外做顯式標記以最大化命中率。

## 動機

- `src/app/api/chat/route.ts:451, 588` 的 `streamText()` 目前完全沒有帶 cache 參數
- System prompt 約 1076 行（`src/lib/ai/system-prompt.ts`），粗估 15-20K tokens，每輪都全量重送
- 工具定義（10+ 組 tools）JSON 化後約 5-8K tokens，同樣每輪重送
- 對話 N 輪 → 多付 N 倍 system + tools token 成本；這是 token 花費最主要的漏點
- `@ai-sdk/anthropic` v3 支援 `providerOptions.anthropic.cacheControl`，技術上完全可行

## 目標

1. Anthropic 模型呼叫時，把 system prompt 標記為 `cache_control: { type: "ephemeral" }`
2. Tools 定義整塊標記為 cacheable
3. 非 Anthropic 模型（OpenAI / Google）不受影響，邏輯走 fallback
4. 在回傳的 usage 觀察 `cache_read_input_tokens` 與 `cache_creation_input_tokens`，並記入 quota / cost 統計
5. 取消 compact fallback 的 `streamText`（route.ts:588）也一併啟用快取

## 非目標

- 不實作「按 conversation 分群的長期快取」（ephemeral 5 分鐘 TTL 即可）
- 不做 messages 陣列內的個別 message 快取（單次對話內 ROI 偏低，留待後續評估）
- 不為 OpenAI / Gemini 做顯式 caching API 呼叫（OpenAI 是自動的；Gemini 顯式 cache 需額外管理 cache 物件生命週期，第一版只取 implicit 折扣）
- 不為 editCode 的 current code 上下文做快取（內容每次都變，無意義）

## 影響範圍

### 需修改的檔案

| 檔案 | 說明 |
|------|------|
| `src/lib/ai/models.ts` | 新增 `isAnthropicModel(modelId)` helper，或暴露 provider 資訊 |
| `src/app/api/chat/route.ts` | `streamText` 呼叫加上 `providerOptions` + system/tools cacheControl |
| `src/lib/quota.ts` | （若有）把 `cache_read_input_tokens` 以 0.1x 單價計入 cost |
| `src/lib/ai/generate-title.ts` | 視情況評估是否快取（短 prompt，不急） |

### 新增的檔案

| 檔案 | 說明 |
|------|------|
| `src/lib/ai/cache-control.ts` | 集中「什麼 provider 支援快取」「cacheControl payload 怎麼組」的邏輯 |

## 風險

| 風險 | 緩解措施 |
|------|----------|
| System prompt 因動態組裝（依 dataSources）導致快取命中率低 | 將「dataSources 無關的固定區塊」放前面、可變區塊放後面，讓快取命中最大區塊 |
| 快取 5 分鐘 TTL 不夠長 | 實測觀察；必要時升級為 1h cache（beta header） |
| 非 Anthropic provider 誤傳 cacheControl 造成錯誤 | 用 `isAnthropicModel()` 條件判斷，只對 Anthropic 傳 |
| cost 統計不更新會高估費用 | 同步修改 `estimateCost()` 支援 `cachedInputTokens` 參數 |

## 驗收標準

1. 連續 5 輪對話，從第 2 輪開始 usage 回傳的 `cache_read_input_tokens > 0`
2. 非 Anthropic 模型（gpt-5-mini、gemini-flash）仍可正常運作，無 provider 錯誤
3. 成本統計正確反映快取折扣（log 可見 cache hit rate）
4. 現有自動化測試全部綠燈
5. 長對話（10+ 輪）實測 token 成本下降 > 25%
