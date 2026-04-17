# Tasks: improve-code-editing-safety

## 1. Schema

- [x] 1.1 `prisma/schema.prisma` 新增 `ToolCodeSnapshot` model + `Tool.snapshots` relation
- [x] 1.2 建 migration `prisma/migrations/20260417130000_add_tool_code_snapshots/migration.sql`
- [x] 1.3 `bunx prisma generate` 更新 client（使用者端 `migrate deploy` 套用）

## 2. Snapshot helper

- [x] 2.1 建 `src/lib/tool-snapshot.ts`：`applyCodeUpdate(toolId, newCode, explanation?)` / `listSnapshots(toolId)` / `restoreSnapshot(toolId, snapshotId)`（helper 名稱改為 `applyCodeUpdate`，all-in-one 比「僅 snapshot」語意清晰）
- [x] 2.2 `applyCodeUpdate` 比對 `newCode !== currentCode` 才 snapshot；snapshot 後若該 tool 超過 20 筆則刪最舊（transaction 內）
- [x] 2.3 `restoreSnapshot` 驗證 snapshot 屬於該 tool，透過 `applyCodeUpdate` 寫回（自動 snapshot 當前版）
- [x] 2.4 為 `tool-snapshot.ts` 寫 9 個 unit test：相同 code / 不同 code / 補 explanation / 清舊超過 20 / tool 不存在 / 列表 / 還原 / snapshot 不存在 / snapshot 不屬該 tool

## 3. AI Tools

- [x] 3.1 `updateCode.execute`：existing draft 分支改呼叫 `applyCodeUpdate(existing.id, code, explanation)`
- [x] 3.2 新增 `editCode` tool：`{ find, replace, explanation }`，uniqueness 檢查（0 / >1 / 1），1 時走 `applyCodeUpdate`
- [x] 3.3 `tools.test.ts` 寫 8 個 unit test 涵蓋 updateCode snapshot、editCode 各種 edge case 與錯誤包裝

## 4. System prompt

- [x] 4.1 重寫 `When to use updateCode` 區塊為「editCode (default) vs updateCode (full rewrite)」，新增 editCode 用法與 `edit_code_error` 重試規則
- [x] 4.2 加 Critical Rule 6「Prefer editCode for small changes」；updateCode 描述加「MUST preserve every part ... do not drop features」
- [x] 4.3 system prompt 加兩個斷言：prefer editCode / preserve every part / do not drop features

## 5. API

- [x] 5.1 `GET /api/tools/[id]/snapshots`：驗 ownership → `listSnapshots` 回最近 20 筆 `{ id, explanation, createdAt }`
- [x] 5.2 `POST /api/tools/[id]/snapshots/[snapshotId]/restore`：驗 ownership → `restoreSnapshot` → 回新 `Tool`；snapshot 不存在回 404
- [x] 5.3 兩個 route 各 5 個 API 測試（401 / 404 / 403 / 成功 / missing snapshot）

## 6. UI

- [x] 6.1 新增 `VersionHistoryButton` client 元件：Dialog 開啟時載入 snapshots，列每筆 explanation + 絕對時間（`zh-TW`）+ 還原按鈕；工具詳情頁只對 owner 顯示
- [x] 6.2 還原按鈕開二次確認 Dialog，成功後 toast「已還原至此版本」+ `router.refresh()` 重新載入

## 7. 整合與驗證

- [x] 7.1 手動端到端：工具編輯 → 小改用 editCode → 歷史頁看得到 snapshot → 還原 → 檢查 code 正確
- [x] 7.2 驗證：updateCode 大改 → snapshot 有舊版 → 可還原
- [x] 7.3 驗證：editCode find 不唯一時 AI 能看到錯誤並重試
- [x] 7.4 跑 `openspec validate improve-code-editing-safety --strict`

## 8. 歸檔

- [x] 8.1 所有任務完成後 `openspec archive improve-code-editing-safety --yes`
