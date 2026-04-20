# Proposal: 文本附件上傳智能截斷與警告

## 概述

對使用者上傳的「文本類」附件（txt / md / csv / json / code 等）在送進 prompt 前設定大小上限、提示使用者、必要時自動摘要或截斷，避免單一大檔把整個 context window 吃光。

## 動機

- `src/app/api/chat/route.ts:85-101` 目前會把文本附件 `Buffer.from(...).toString("utf-8")` 全文塞進 prompt
- 使用者上傳一份 100KB CSV → 約 25K tokens 當場進入 context；一次對話瞬間逼近 compact 門檻
- 使用者通常沒意識到附件會吃多少 token，沒有任何警告
- 結合之前加的 compact 機制：大附件會觸發不必要的 compact 摘要呼叫，double cost

## 目標

1. 上傳（前端）或收到（後端）文本附件時，估算 token 數
2. 超過「建議上限」（預設 8K tokens，約 30KB 純文字）時，前端提示使用者並提供選項：
   - 截斷前 N 行
   - 只保留 header + 前 20 行（CSV/JSON 特化）
   - 仍要完整送出
3. 超過「硬上限」（預設 32K tokens，約 128KB）時，後端拒絕並回傳錯誤訊息
4. 不影響圖片（image tokens 固定 ≈ 1500/張，由 Anthropic 計算，不受此限制）
5. 保留二進位檔案既有行為（不解析，僅傳檔名 hint）

## 非目標

- 不做「自動摘要大 CSV」這種複雜邏輯（第一版）
- 不支援從檔案只擷取關鍵欄位
- 不做 PDF / Word 解析（另案處理）
- 不做「把大檔案上傳到 Files API 由 server 保管」的機制（未來可加）

## 影響範圍

### 需修改的檔案

| 檔案 | 說明 |
|------|------|
| `src/app/api/chat/route.ts` | `buildMessageContent()` 加入 token 估算 + 截斷邏輯 |
| `src/app/(app)/chat/page.tsx`（或上傳元件） | 上傳時前端預估 token，顯示警告與選項 |
| `src/lib/ai/token-utils.ts` | 若不存在，補一個 `estimateFileTokens(file): number` |

### 新增的檔案

| 檔案 | 說明 |
|------|------|
| `src/lib/attachments/text-truncate.ts` | 截斷策略（head / csv-smart / reject）|
| `src/lib/attachments/limits.ts` | 上限常數與錯誤訊息 |

## 風險

| 風險 | 緩解措施 |
|------|----------|
| 使用者體驗變差（上傳被擋） | 明確顯示「建議上限 8K tokens ≈ 30KB」並提供截斷選項，不是直接拒絕 |
| 截斷後資料不完整導致 AI 回答錯誤 | 截斷時附註「[已截斷，原始 N 行，只保留 M 行]」，AI prompt 中明確提示 |
| 估算公式與實際 token 數有落差 | 使用既有 `estimateTokens()`（CJK 1, 英文 0.25）保守估計 |

## 驗收標準

1. 上傳 5KB 文本檔 → 無警告，完整送出（現況不變）
2. 上傳 50KB 文本檔 → 前端顯示警告 + 截斷選項
3. 上傳 200KB 文本檔 → 後端拒絕並回傳 `attachment_too_large` 錯誤
4. 截斷後的 prompt 明確標註「已截斷」
5. 圖片上傳行為完全不變
