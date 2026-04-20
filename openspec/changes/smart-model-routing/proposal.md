# Proposal: 簡單查詢自動降級到 Haiku

## 概述

當使用者選擇高階模型（Opus / Sonnet / Pro）但第一則訊息看起來是「簡單查詢類」（例如純資料查問、簡單計算、閒聊），後端自動改用 Haiku 回應，在對話真正需要時（工具呼叫多、涉及程式生成、分析推理）再升回原選模型。預期能在對話前段省下大量高單價 token。

## 動機

- 預設模型已是 Haiku（`src/lib/ai/models.ts:55`），但使用者手動選 Opus 後，所有對話一律跑 Opus
- 很多「查一下 XX」「幫我看 YY」的簡單問題用 Haiku 已經夠好
- Opus 單價 15 / 75（input / output per 1M），Haiku 1 / 5 — 省 15-20 倍
- 關鍵是「判斷何時升級」：工具呼叫 / 程式碼生成 / 複雜推理需求出現時即升回

## 目標

1. 新增 `routeModel(userMessage, selectedModel)` 函式：依訊息特徵決定實際 model
2. 簡單查詢（純資料查、簡答、閒聊）→ 降到 Haiku
3. 複雜需求（程式碼生成、圖片生成、工具多步、深度分析）→ 保持使用者選擇的 model
4. 使用者顯式選 Haiku 時，不做任何路由（本來就最便宜）
5. 在 stream 事件告知前端「實際使用的 model」，可顯示 badge / tooltip

## 非目標

- 不用小模型做「分類判斷」（那樣又多一次呼叫成本抵銷收益），用規則 + heuristics
- 不做「對話中途自動切換 model」（太複雜，第一版只做首輪判斷）
- 不做使用者可關閉的 opt-out（第一版先全員啟用，實測後再決定）
- 不對 OpenAI / Google 模型做類似路由（第一版 Anthropic only）

## 影響範圍

### 需修改的檔案

| 檔案 | 說明 |
|------|------|
| `src/app/api/chat/route.ts` | 呼叫 `routeModel()`，並在 stream 告知前端實際 model |
| `src/app/(app)/chat/page.tsx` | 顯示「此回答使用 Haiku（自動降級）」的 badge |

### 新增的檔案

| 檔案 | 說明 |
|------|------|
| `src/lib/ai/route-model.ts` | 路由邏輯：訊息特徵偵測 + 模型決策 |

## 判斷啟發式（Heuristics）

**降級條件（同時滿足才降級）：**
- 訊息長度 < 200 字元
- 無附件（文字或圖片）
- 無關鍵字：程式/程式碼/寫個/改/重構/分析/報告/設計/compare/build / 這些詞
- 無「建議資料來源」類觸發條件

**升級回原 model 的條件（任一出現即保持原 model）：**
- 使用者明確要求程式碼（出現 "寫"、"改"、"程式"、"code" 等）
- 附件存在
- 訊息超過 200 字元
- 使用者在同一對話中已有工具呼叫（conversation history）

## 風險

| 風險 | 緩解措施 |
|------|----------|
| Haiku 答得不如 Opus，使用者體驗下降 | 前端明顯標示「自動降級」，使用者可重新選 model 重發 |
| 判斷錯誤把複雜問題丟給 Haiku | heuristics 偏保守：不確定時維持原 model（false negative 優先於 false positive）|
| 增加決策複雜度，之後難維護 | 路由邏輯集中在 `route-model.ts`，純函數可測 |

## 驗收標準

1. 使用者選 Opus + 訊息「今天天氣如何」→ 實際用 Haiku，前端顯示降級 badge
2. 使用者選 Opus + 訊息「幫我寫一個 todo list 應用」→ 實際用 Opus
3. 使用者選 Haiku → 永遠用 Haiku（無路由）
4. 對話已有 tool call 歷史 → 後續訊息不降級
5. 單元測試覆蓋 10+ 個 heuristic case
