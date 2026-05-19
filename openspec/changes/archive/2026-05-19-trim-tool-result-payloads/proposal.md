# Proposal: 修剪 Sheets / Gmail tool result 多餘 payload

## Why

兩個被 AI tool 路徑使用的 connector 回傳 payload 含明顯冗餘 / 失控的部分：

1. **Sheets `read` 同一份資料寫了三份**：`src/lib/connectors/google/sheets.ts:262-270` 同時回傳 `headers` + `rows`（已 humanize 的 key-value 物件陣列）+ `raw`（headers + rows 的原始 2D array）。`raw` 跟 `headers + rows` 內容完全重複。一份 100 行的 sheet：rows ~30k chars + raw ~25k chars 而 LLM 實際上 99% 只用 `.rows`（system prompt 也只教 `.rows` 用法）。
2. **Gmail `read` 不裁 body**：`src/lib/connectors/google/gmail.ts:198` 把整封信 base64 解碼後完整回傳。長串轉寄信、含 footer 的行銷信可以 50k+ chars。

兩個都會被 chat 路徑的 streamText tool result 完整序列化進 messages，每個 multi-step loop 重發都乘 N 倍。對長對話 + 上一個 change `truncate-historical-tool-results` 已處理「舊輪 result 裁切」，但「新一輪 result 本身就太大」這個漏點仍在。

## What Changes

只動 chat tool 路徑（`src/lib/ai/google-tools.ts`），不動共用 connector，也不動 `src/lib/bridge/handlers.ts`（部署後工具 runtime 走 bridge handler，仍拿完整 payload 維持 backward compat）：

1. **Sheets read 拿掉 `raw`**：在 `google-tools.ts` 處理 sheets service 的 read/list 回傳時，若 `result.data` 是 `{ headers, rows, raw }` 形式，移除 `raw` 鍵後再 return 給 LLM
2. **Gmail body 裁切**：對 gmail service 的 read 回傳，若 `result.data.body` 長度 > 5000 chars，截首 5000 chars 並加 `\n\n[Body truncated: kept first 5000 chars of N total]` 標記
3. **System prompt 更新**：`src/lib/ai/system-prompt.ts` 移除 sheets 段落裡的 `raw: [[...]]` 描述（LLM 不該再被引導取 raw）
4. **不動 bridge handlers**：部署後工具透過 `window.companyAPI` 呼叫 sheets/gmail 仍拿完整 payload — 維持工具 runtime backward compat

預估：
- Sheets read 平均省 30-50% payload，多 step tool loop 乘 N 倍
- Gmail read 對長信省 80%+

**BREAKING**: 對 chat 路徑無 breaking（LLM 沒在用 `.raw`）。對部署工具完全無影響（bridge 不動）。

## Impact

- Affected specs: `studio` (ADDED — Tool Result Payload Trimming)
- Affected code:
  - `src/lib/ai/google-tools.ts`：sheets read 後處理 + gmail body 裁切（合計 ~20 行）
  - `src/lib/ai/system-prompt.ts`：sheets 段落描述更新
  - 新增 `src/lib/ai/trim-tool-payload.ts`（小型 helper 函式，純函式好測試）
  - 新增 `src/lib/ai/trim-tool-payload.test.ts`
- 不動：DB schema、`/api/*` API、`src/lib/connectors/google/*`、`src/lib/bridge/handlers.ts`、部署工具行為
