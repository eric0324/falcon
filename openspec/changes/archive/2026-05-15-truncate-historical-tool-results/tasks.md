# Tasks: 歷史 tool result 自動裁切

## Task 1: Helper 純函式
- [x] 1.1 建立 `src/lib/ai/truncate-history.ts`
- [x] 1.2 export `truncateHistoricalToolResults(...)`，另暴露 `truncateHistoricalToolResultsWithStats(...)` 給 route 寫 log
- [x] 1.3 演算法：從尾巴往回找第 `keepRecentTurns` 個 user message 的 index；index >= 該位置保留 raw；之前的 assistant message 過裁切流程
- [x] 1.4 裁切流程：對每個 `toolCalls[].result`，`estimateTokens(JSON.stringify(result)) > maxResultTokens` 才裁，替換為 `"[TRUNCATED]\n" + serialized.slice(0, charBudget) + "\n[truncated: kept first ~N tokens of M total]"`
- [x] 1.5 淺複製：用 `.map` + `{...msg}` + `{...tc}`，不污染輸入

## Task 2: 單元測試
- [x] 2.1 建立 `src/lib/ai/truncate-history.test.ts`
- [x] 2.2 測試：對話只有 1 個 user message → 全部保留 raw
- [x] 2.3 測試：對話只有 2 個 user message → 全部保留 raw
- [x] 2.4 測試：對話有 3+ user message → 最舊那輪 result 被裁，其他保留
- [x] 2.5 測試：result 小於 maxResultTokens → 即使在歷史段也不裁
- [x] 2.6 測試：裁切後 result 是字串、含 `[TRUNCATED]` 前綴與 `[truncated: ...]` 後綴
- [x] 2.7 測試：原 messages 陣列與 message 物件未被修改
- [x] 2.8 測試：assistant 沒有 toolCalls → 原樣保留
- [x] 2.9 額外：單一 assistant 有多個 toolCall，只裁大的、保留小的

## Task 3: chat route 接入
- [x] 3.1 import `truncateHistoricalToolResultsWithStats`
- [x] 3.2 在 process loop 前先過一道 truncation，`keepRecentTurns: 2, maxResultTokens: 1000`
- [x] 3.3 後續 process loop 使用 `trimmedHistory[i]`；`isLastUserMessage` 跟著用 `trimmedHistory.length`
- [x] 3.4 log: `[Chat API] historical tool results truncated: N results, saved ≈M tokens`（只在 N > 0 時印）

## Task 4: 驗收
- [x] 4.1 既有測試全綠（910 tests pass，含 9 個新測試）
- [x] 4.2 `bunx tsc --noEmit` 無新增錯誤
- [x] 4.3 本地實測 5+ 輪含 tool call 的對話：第 3 輪起 log 顯示 truncated count > 0
- [x] 4.4 UI 顯示對話歷史仍是完整 raw（裁切沒寫回 DB）

## Task 5: 收尾
- [x] 5.1 Changelog v0.33.2 條目（內部優化 showDialog: false）
- [x] 5.2 `openspec validate truncate-historical-tool-results --strict` 通過
- [x] 5.3 archive

## 依賴關係

```
Task 1 ── Task 2 ──┐
                   ├── Task 3 ── Task 4 ── Task 5
              ─────┘
```

- Task 1、2 一起做（TDD：先寫測試）
- Task 3 依賴 helper 介面
- Task 4 整體驗收
- Task 5 收尾
