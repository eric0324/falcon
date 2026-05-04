# Proposal: 編輯工具表單變空白的 silent failure

## 概述

Chat 頁載入工具編輯模式（`/chat?edit=:id`）時，若 `/api/tools/:id` 回非 2xx（401 / 403 / 404 / 500），前端 fetch 沒檢查 `res.ok`，直接把 error response 當作 tool 物件去 `setToolName(tool.name)` 等等 — 結果 `tool.name` 是 undefined，整個編輯表單變空白。catch 也不會被觸發（因為 `res.json()` 自己沒 throw）。

## 動機

- 使用者報「不明原因」表單空白 — 這個 bug 路徑剛好對應幾種常見情境（session 過期、工具被改 PRIVATE、工具被刪）
- 修法極小：檢查 `res.ok`，失敗時 throw 進既有 catch（會 toast 錯誤）
- catch 已經有 `t("toast.loadToolError")` 提示文案，補上才會真的觸發

## 影響範圍

`src/app/(app)/chat/page.tsx` line 308-347 的 useEffect — 改 fetch 處理流程。

## 驗收

1. API 回 200 → 表單正確載入工具資料（既有行為）
2. API 回 401 / 403 / 404 / 500 → 不再 silently 把 state set 成 undefined；toast 顯示 `loadToolError`
3. Network error（fetch reject）→ 同樣走 catch，行為一致
