# Proposal: 對話自動壓縮 (Auto Compact)

## 概述

當對話接近 AI model 的 context window 上限時，自動將舊訊息摘要壓縮，保留最近的訊息，讓對話可以無限延續而不會因為 token 限制而中斷。

## 動機

- 目前每次呼叫 `/api/chat` 都把**完整 messages 陣列**送給 AI，隨著對話長度增長，會超過 model 的 context window
- 長對話的 token 消耗非常高（每次都重送全部歷史）
- 使用者長時間對話時會遇到 API 錯誤或回應品質下降
- Claude Code 等現代 AI 工具已有類似機制，使用者期待無縫的長對話體驗

## 目標

1. 在送出 messages 前估算 token 數量，當接近 context window 閾值時自動觸發壓縮
2. 用便宜快速的 model 將舊訊息摘要為精簡 summary
3. 以 summary + 最近訊息取代完整歷史，送給 AI
4. 前端顯示壓縮發生的提示，使用者仍可看到完整歷史
5. Summary 持久化到資料庫，重新載入對話時可直接使用

## 非目標

- 不改變現有的 message 顯示邏輯（前端保留完整歷史）
- 不改變訊息的儲存格式
- 不提供手動觸發壓縮的 UI（第一版）
- 不做精確的 tokenizer 計算（使用字元數粗估）

## 影響範圍

### 新增的檔案

| 檔案 | 說明 |
|------|------|
| `src/lib/ai/token-utils.ts` | Token 估算 + model context window 對照表 |
| `src/lib/ai/compact.ts` | 壓縮邏輯：判斷、摘要、重組 messages |

### 需修改的檔案

| 檔案 | 說明 |
|------|------|
| `prisma/schema.prisma` | Conversation 新增 `summary` 欄位 |
| `src/app/api/chat/route.ts` | 在 streamText 前插入 compact 邏輯 |
| `src/app/(app)/chat/page.tsx` | 處理 compact stream 事件、顯示提示 |
| `src/app/api/conversations/[id]/route.ts` | 回傳 summary 欄位 |

## 風險

| 風險 | 緩解措施 |
|------|----------|
| 摘要遺漏重要資訊 | 摘要 prompt 明確列出要保留的資訊類型 |
| 摘要增加回應延遲 | 用最快的 model (haiku) 做摘要，預估 1-2 秒 |
| Token 估算不準確 | 使用保守閾值 (80%)，寧可早觸發也不要撞限制 |
| 摘要品質不一致 | 設計明確的摘要 prompt，約束輸出格式 |

## 驗收標準

1. 短對話（< 80% context）不觸發壓縮，行為與現在完全相同
2. 長對話自動觸發壓縮，AI 能正確理解前文脈絡
3. 壓縮後前端顯示提示訊息
4. 重新載入對話時使用已存的 summary
5. 不同 model 使用對應的 context window 閾值
