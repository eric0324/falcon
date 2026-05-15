# Proposal: 歷史 tool result 自動裁切

## Why

`src/lib/conversation-messages.ts:64` 的 `getMessages` 把 DB 存的歷史 tool calls 連同 `result` 原封不動讀回，`src/app/api/chat/route.ts:559-570` 再把這些 `result` 用 `JSON.stringify` 整段塞回送往 LLM 的 `tool-result` parts。

結果：

- 第 10 輪對話可能還塞著第 1 輪的 `slack.search` / `notion.query` / `ga4.breakdown` 完整 JSON
- multi-step tool loop（`MAX_STEPS = 15`）每步都重發整包 messages
- 即便 prompt cache 命中 system，messages 段每次都進 input — 一筆 5000 tokens 的舊 tool result 在 10 輪對話 + 平均 5 步/輪 = 重發 50 次

長對話越往後越貴，主因就在這裡。

## What Changes

新增 helper：`truncateHistoricalToolResults(messages, options)`，在 `chat/route.ts` 將歷史 `Message[]` 送進 `processedMessages` 拼裝前先過一道：

- **保留**：最後 2 個 user message 起算（含其後所有 assistant / tool message）→ 完整 raw result 不動
- **裁切**：更早的 assistant message 中，每個 `toolCalls[].result` 若估算 > 1000 tokens，裁到 ~1000 tokens 並加 `\n\n[truncated: kept first ~1000 tokens of N total]` 標記
- **裁切方式**：將 `result` 先 `JSON.stringify` 成字串，從頭保留 ~4000 字元（≈ 1000 tokens 經 `estimateTokens` 換算），裁切後仍存成原 `result` 欄位（型別維持 `unknown`，內容變字串）
- **不寫 DB**：裁切只發生在送 LLM 的記憶體拷貝，UI 顯示、admin 頁、其他 `getMessages` 呼叫者看到的仍是完整資料

`route.ts` 直接呼叫 helper，傳入 `messages` 與固定參數 `{ keepRecentTurns: 2, maxResultTokens: 1000 }`。

預期：第 5 輪後對話的 input tokens 降幅 20-50%（視 tool 使用頻率與 result 大小）；對 Anthropic 配合 prompt cache 已命中 system 段的情況，整體 cost 降幅更顯著。

**BREAKING**: 無。helper 在 chat route 內部使用，DB schema 與 message API 完全不變。

## Impact

- Affected specs: `studio` (ADDED — Historical Tool Result Truncation)
- Affected code:
  - 新增 `src/lib/ai/truncate-history.ts`：純函式 helper + 單元測試
  - 修改 `src/app/api/chat/route.ts`：`messages` 進入 process loop 前先 `truncateHistoricalToolResults(...)`
- 不動 DB schema，不動 `getMessages` / `appendMessages`，不影響 UI 顯示
