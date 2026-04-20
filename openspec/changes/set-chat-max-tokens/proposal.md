# Proposal: 主聊天設定 max output tokens

## 概述

`src/app/api/chat/route.ts:451, 588` 的 `streamText()` 完全沒帶 `maxOutputTokens`，吃 Vercel AI SDK 預設值。為主聊天設定明確的輸出上限（預設 4096，可依模型微調），避免 AI 偶爾 runaway 生成超長回應導致成本爆炸。

## 動機

- 目前 `streamText()` 無 `maxOutputTokens` 參數
- Vercel AI SDK 對 Anthropic 的預設可能高達 8192 或更多（與模型有關）
- 罕見情況下 AI 會持續生成（例如生成超長 markdown 表格、無限重複、JSON 巨大結構）
- Output token 單價是 input 的 3-5 倍，runaway 一次的代價非常高
- 這是「改動最小、收益穩」的防呆措施

## 目標

1. 為主聊天 `streamText()` 設定 `maxOutputTokens: 4096`（合理回答上限）
2. 為 final fallback `streamText()`（route.ts:588）設定相同上限
3. 不影響已經有上限的呼叫（`generateConversationTitle` 已設 30，保留）
4. 不影響 `compactMessages` 的摘要呼叫（屬內部用，視需求決定）
5. 提供 per-model override 能力（例如 Opus 可放寬到 8192）

## 非目標

- 不做 dynamic token budget（依對話複雜度動態調整）
- 不做使用者可調整的「回答長度」設定
- 不在前端顯示「已達輸出上限」提示（第一版）

## 影響範圍

### 需修改的檔案

| 檔案 | 說明 |
|------|------|
| `src/app/api/chat/route.ts` | 兩處 `streamText()` 加 `maxOutputTokens` |
| `src/lib/ai/models.ts` | 新增 `getDefaultMaxOutputTokens(modelId): number` |
| `src/lib/ai/compact.ts` | 視需求補上限（目前用 generateText 摘要，預設應該夠用） |

## 風險

| 風險 | 緩解措施 |
|------|----------|
| 4096 對某些長報告型回答太短 | 各 model 可獨立調整；觀察實際 cut-off 比例調整預設值 |
| 截斷在句中導致回答看起來壞掉 | Vercel AI SDK 會送出 `finishReason: "length"`，可在 log 監控比例 |
| 截斷後 tool call sequence 中斷 | tool call 一般輸出較短，4096 足夠；萬一截斷則由 stream `error` 處理 |

## 驗收標準

1. 一般對話（< 4096 tokens 回答）行為不變
2. 強制 AI 生成超長內容時，回答在 4096 tokens 截斷，stream 收到 `finishReason: "length"`
3. `generateConversationTitle` 仍是 30 tokens 上限
4. 各 model 可透過 `getDefaultMaxOutputTokens()` 獨立配置
5. log 中可見 `finishReason` 統計
