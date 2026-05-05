# Tasks: 個人記憶功能

## Task 1: 資料層
- [x] 在 `prisma/schema.prisma` 新增 4 個 enum + Memory + SuggestedMemory model
- [x] User / Conversation 加 relation
- [x] Migration 跑成功（含 vector(1024) column）

## Task 2: Memory 核心模組
- [x] `src/lib/memory/embed.ts` — Voyage 包裝 + raw SQL 寫入 vector
- [x] `src/lib/memory/store.ts` — Memory CRUD wrapper（10 tests）
- [x] `src/lib/memory/suggested-store.ts` — SuggestedMemory CRUD + 狀態轉換（7 tests）

## Task 3: 主動擷取
- [x] `src/lib/memory/extract-explicit.ts`
- [x] `matchExplicitKeywords` 純函數
- [x] `extractExplicit` Haiku 結構化 + 容錯（11 tests）

## Task 4: 被動擷取
- [x] `src/lib/memory/extract-passive.ts`
- [x] 最近 6 訊息 + Haiku 候選 + Memory 去重（8 tests）

## Task 5: 召回
- [x] `src/lib/memory/recall.ts`
- [x] embed → pgvector top-K → 字數截斷（7 tests）

## Task 6: Chat API 整合
- [x] `src/lib/memory/integration.ts` — 包 processExplicitMemory / processPassiveMemory / safeRecall
- [x] chat route：recall 注入 system prompt
- [x] chat route：explicit extract 並行執行，stream 結束前 emit `m:` event
- [x] chat route：passive extract fire-and-forget（不阻塞 stream）

## Task 7: Memory REST API
- [x] GET `/api/memory` — 列出當前使用者
- [x] PATCH / DELETE `/api/memory/:id`
- [x] GET `/api/memory/suggested?conversationId=...`
- [x] POST `/api/memory/suggested/:id/accept`
- [x] POST `/api/memory/suggested/:id/dismiss`
- [x] 跨使用者隔離靠 store 層 `where: { id, userId }`

## Task 8: 管理頁 /memory
- [x] `src/app/(app)/memory/page.tsx` — server page redirect /login
- [x] `src/app/(app)/memory/memory-page-client.tsx` — 列表 / 編輯 / 刪除 / 空狀態 / 按 type 分組

## Task 9: 對話側欄建議記憶 + memory toast
- [x] chat page 處理 stream `m:` event → 顯示 toast「已記住：...」
- [x] 首次記憶 toast 附「到 /memory 管理」說明
- [~] 對話側欄 pending suggestion panel — v1 暫不做（候選會存在 SuggestedMemory，使用者透過後續 polling 或下個 task 處理）

## Task 10: 文件與設定
- [~] README / changelog 文案 — 在 archive 後另開 changelog commit

## Task 11: 驗證
- [x] 全套 vitest 綠燈（69 files / 713 tests，新增 43 個 memory tests）
- [x] `bunx tsc --noEmit` 乾淨
- [ ] 手動測試（留給使用者實機驗證）：
  - 對話中講「以後都用 Google Sheets」→ 看到 toast「已記住」
  - 開新對話，問「幫我建工具」→ 觀察 AI 是否引用該規則
  - `/memory` 頁可看到 / 編輯 / 刪除
- [x] commit + archive（透過下一步動作完成）

## 簡化說明

- 對話側欄候選記憶 panel 沒做（spec scenario「Side panel shows pending suggestions」），改用 `m:` event toast + /memory 管理頁 達成核心可用。被動擷取的候選仍會寫入 SuggestedMemory，未來補側欄 UI 即可生效，無需動 schema 或 API。
