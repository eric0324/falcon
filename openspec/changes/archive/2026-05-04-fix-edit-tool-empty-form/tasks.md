# Tasks: 編輯工具表單變空白

## Task 1: 修 fetch 處理
- [x] 在 `src/app/(app)/chat/page.tsx` 的 edit-mode useEffect 改 fetch chain
  - [x] 第一個 `.then` 改成 `if (!res.ok) throw new Error(...)`
  - [x] 確保失敗時 catch 觸發既有 `loadToolError` toast

## Task 2: 驗證
- [x] `bunx tsc --noEmit` 乾淨
- [x] 全套 vitest 無 regression
- [x] 手動驗證：登出後從詳細頁點 Edit → 預期看到 toast 而非空白表單
- [x] commit + `openspec archive fix-edit-tool-empty-form --yes`

> 測試覆蓋說明：此修改在 chat client component 內部 useEffect，專案無 jsdom 環境，client-side state 行為靠手動驗證確認。
