# Tasks: 知識庫頁面 server-side 權限守門

## Task 1: 寫測試（紅燈）
- [x] 建立 `src/app/(app)/knowledge/[id]/page.test.tsx`
  - [x] 已登入非成員 → 應呼叫 `notFound()`
  - [x] 已登入成員（VIEWER）→ 應 render 出 KnowledgeDetailClient
  - [x] 未登入 → 應 redirect /login（保留既有測試）
- [x] 建立 `src/app/(app)/knowledge/[id]/settings/page.test.tsx`
  - [x] 已登入非成員 → 應 `notFound()`
  - [x] 已登入 VIEWER → 應 redirect 至 `/knowledge/:id`
  - [x] 已登入 CONTRIBUTOR → 應 redirect 至 `/knowledge/:id`
  - [x] 已登入 ADMIN → 應 render 出 KnowledgeSettingsClient
- [x] 確認所有新測試 fail（紅燈）

## Task 2: 修正 detail page
- [x] 修改 `src/app/(app)/knowledge/[id]/page.tsx`
  - [x] import `getKnowledgeBaseRole` 與 `notFound`
  - [x] session 檢查通過後，呼叫 `getKnowledgeBaseRole(id, session.user.id)`
  - [x] role 為 null → `notFound()`
- [x] 跑 detail page 測試 → 全綠

## Task 3: 修正 settings page
- [x] 修改 `src/app/(app)/knowledge/[id]/settings/page.tsx`
  - [x] import `getKnowledgeBaseRole`、`hasMinRole`、`notFound`、`redirect`
  - [x] session 檢查通過後，呼叫 `getKnowledgeBaseRole(id, session.user.id)`
  - [x] role 為 null → `notFound()`
  - [x] `!hasMinRole(role, "ADMIN")` → `redirect(\`/knowledge/${id}\`)`
- [x] 跑 settings page 測試 → 全綠

## Task 4: Regression 驗證
- [x] 跑全套 vitest（`bun run test` 或 `bun run vitest`），確認沒有打到既有測試（62 files / 656 tests 全綠）
- [x] 跑 `bunx tsc --noEmit`，type check 乾淨
- [~] 手動測試（dev server）— 使用者選擇省略，由單元測試覆蓋三條路徑（非成員 notFound / 非 ADMIN redirect / ADMIN 正常 render）

## Task 5: 收尾
- [x] `openspec validate fix-knowledge-base-page-guard --strict --no-interactive` 通過
- [x] commit（type: fix，message 描述 server-side guard 修正）
- [x] 完成所有任務後 `openspec archive fix-knowledge-base-page-guard --yes`

## 依賴關係

```
Task 1 (寫測試) → Task 2 (修 detail) ┐
                → Task 3 (修 settings) ┴→ Task 4 (regression) → Task 5 (archive)
```

Task 2 / 3 可並行
