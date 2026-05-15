# Design: 歷史 tool result 自動裁切

## Context

Falcon 把使用者對話完整存進 DB，後端每次收到 user message 時 `getMessages` 讀回完整 history。`chat/route.ts` 把 history 轉成 AI SDK 的 `CoreMessage[]`，其中 assistant 的 `toolCalls` 被拆成兩條 message：

1. `{ role: "assistant", content: [text-part, ...tool-call parts] }`
2. `{ role: "tool", content: [{ type: "tool-result", output: { type: "text", value: JSON.stringify(tc.result) } }, ...] }`

每步 `streamText` 都重發完整 messages（system 已透過 cache 命中，但 messages 段是新的 input）。Multi-step tool loop 每輪 user message 通常觸發 3-8 步，每步都送整包。

舊輪的大型 tool result（Slack search 200+ 筆、Notion DB query、GA4 breakdown）就在每步都被重發。

## Goals

1. 長對話後段 input tokens 降幅 20-50%
2. 模型仍能精確引用「剛剛這 1-2 輪」的 raw data
3. 零 DB schema 變動，零 UI 影響

## Non-Goals

- 不改 DB 儲存（裁切只發生在送 LLM 的記憶體拷貝）
- 不裁 user message 文字、不裁 assistant 純文字回應、不裁 attachments — 只裁 toolCalls 內的 `result` 欄位
- 不做「依語意摘要」的智慧裁切（這由 `compactMessages` 處理，不重疊責任）
- 不動 admin 頁、conversation 顯示頁、export 等其他 `getMessages` 呼叫者

## Decisions

### Decision 1: 「最近 2 輪」以 user message 為錨點

定義「最近 2 輪」= 從尾巴往前算第 2 個 user message 的位置 P；index >= P 的所有 message 完整保留。

範例：`[u1, a1, u2, a2(toolCalls), u3, a3(toolCalls)]`
- P = index(u2) = 2
- 保留 raw: `u2, a2, u3, a3` 的 toolCalls
- 裁切: `u1, a1` 的 toolCalls

若整段對話 user message 不到 2 個，全部保留 raw（這是新對話常見情況）。

### Decision 2: 裁切上限 1000 tokens 用 estimateTokens 估

`estimateTokens` 已是 falcon 通用估算（CJK 1 token/字，其他 0.4 token/字）。helper 內呼叫 `estimateTokens(JSON.stringify(result))`；> 1000 才裁，否則原樣保留。

裁切實作：先 stringify 成 `s`，由於 `estimateTokens` 對非 CJK 用 0.4 ratio，1000 tokens ≈ 2500 字元（保守取 4000 字元做為硬上限，再二分逼近也可），取前 N 字元並結尾加標記。

簡化做法：直接用「字元數逼近」— 取前 4000 字元，實測 token 落在 800-1600 區間，足夠；不必精準二分。標記文字明確寫「kept first ~1000 tokens」讓模型知道是裁切版。

### Decision 3: 裁切後 result 型別處理

原本 `tc.result` 是 `unknown`（可能是物件、陣列、字串）。裁切後不再保證能 JSON.parse 回原型別 — 字串可能在中途被砍斷。

做法：裁切後的 `result` 存成 **字串**（不是物件），內容為 `"[TRUNCATED]\n" + first_4000_chars + "\n[truncated: kept first ~1000 tokens of N total]"`。

`route.ts:559-570` 用 `JSON.stringify(tc.result)` 序列化進 tool-result.output.value — 對字串會多加一層引號，但模型仍能讀懂字串內容。不需要改 route.ts 的這段邏輯。

### Decision 4: 不裁 user message、不裁 assistant text

只裁 `toolCalls[].result`。理由：
- user message 通常短
- assistant 純文字回應通常是「對前一個 tool result 的解釋」— 是模型的推理鏈，砍掉會破壞 reasoning continuity
- attachments 圖片以 tile 計，已有 `VISION_IMAGE_TOKENS=1500` 常數估算，不在這次 scope

### Decision 5: helper 純函式，獨立檔案

放 `src/lib/ai/truncate-history.ts`，輸入 `Message[]` 輸出 `Message[]`（淺複製避免污染呼叫端）。獨立檔案讓單元測試容易、不污染 conversation-messages.ts（DB 層）或 token-utils.ts（估算層）。

### Decision 6: 寫死參數 vs 設定化

第一版寫死 `keepRecentTurns: 2, maxResultTokens: 1000`。`maxResultTokens` 暫不做 per-tool 客製（例如「knowledge_base 查詢的 result 留 2000」之類）— 先用統一 1000 上線觀察。

## Risks & Mitigations

| 風險 | 緩解 |
|---|---|
| 模型回頭引用早期 raw data（例如「第 1 輪你查到的 Slack 訊息發送人是誰？」），裁切後查不到 | 保留 2 輪緩衝 + 標記明確告知是裁切版，模型可主動重新查詢；極端情況下使用者重發查詢即可 |
| 裁切尾端被砍在 JSON 中間，模型誤以為原始資料就長這樣 | 標記文字明確：`[TRUNCATED]` 前綴 + `[truncated: kept first ~1000 tokens of N total]` 後綴。Anthropic / OpenAI 對截斷標記識別良好 |
| 計算位置時遇到 user message 連續出現的退化情況 | 用「從尾巴往回第 2 個 user index」演算法，user message 連續也能找到正確錨點 |
| 與既有 `compactMessages` / `trimMessagesToFit` 互動 | 順序：先 truncate（這個 change） → 再 compact（既有） → 再 trim 安全網。truncate 縮小單筆 result 大小，compact 摘要整段舊 message，trim 硬截前面 — 三者責任不重疊 |

## Open Questions

無。helper 簽名與行為都已確定，可以進 TDD。
