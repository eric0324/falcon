# Tasks: 首頁分類列新增「全部」入口 + 所有分類頁分頁

## Task 1: i18n
- [x] 1.1 `src/i18n/messages/zh-TW/categories.json` 加 `"all": "全部"`
- [x] 1.2 `src/i18n/messages/en/categories.json` 加 `"all": "All"`

## Task 2: 通用 CategoryToolsGrid client component
- [x] 2.1 新增 `src/components/category-tools-grid.tsx`，接 props `{ initialTools, initialHasMore, favoriteIds, category?, emptyMessage? }`
- [x] 2.2 client component，內部 state 持 `tools[]`、`hasMore`、`loading`
- [x] 2.3 「載入更多」按鈕：點擊呼叫 `GET /api/marketplace?section=newest&limit=24&offset=${tools.length}`，若 `category` 有值則附加 `&category=${category}`
- [x] 2.4 成功時 append 結果、更新 hasMore
- [x] 2.5 `hasMore=false` 時按鈕替換為「已載入全部」靜態文字
- [x] 2.6 載入失敗顯示 toast 並讓按鈕可重試
- [x] 2.7 空狀態用 `emptyMessage` props 客製文案（「全部」與「分類」文案不同）

## Task 3: Category page 統一改為分頁
- [x] 3.1 `src/app/(app)/marketplace/category/[id]/page.tsx`：判斷 `isAll = id === "all"`
- [x] 3.2 `isAll=true` 時跳過 category filter；`isAll=false` 走 `getCategoryById` 驗證
- [x] 3.3 兩條路徑都改 `take: PAGE_SIZE (24)` + `prisma.tool.count` 算 hasMore
- [x] 3.4 改用 `<CategoryToolsGrid>` 統一渲染（移除原本 isAll/regular 分支條件渲染）
- [x] 3.5 metadata title 用「🌐 全部」/ category emoji + name

## Task 4: 膠囊列 prepend「全部」按鈕
- [x] 4.1 `src/app/(app)/page.tsx` 的 Categories 區塊 prepend 🌐 全部 Link
- [x] 4.2 `marketplace/category/[id]/page.tsx` 的膠囊列同樣 prepend
- [x] 4.3 Category page 的「全部」active 樣式：`isAll=true` 時反白
- [x] 4.4 其他分類頁的「全部」按鈕保持非 active

## Task 5: 測試
- [x] 5.1 新增 `src/app/(app)/marketplace/category/[id]/page.test.tsx`：
  - `id="all"` 不過濾 category
  - `id="all"` take=24 + count 被呼叫
  - `id="all"` 不 notFound
  - 未知非 all id 仍 notFound
  - 無 session 仍 redirect
  - regular category 仍套 category filter
  - regular category 也走 take=24 + count
- [x] 5.2 既有測試套件全綠（918 tests pass）
- [x] 5.3 `bunx tsc --noEmit` 無新增錯誤

## Task 6: 驗收
- [x] 6.1 本地進首頁：Categories 列出現「🌐 全部」在最前面
- [x] 6.2 點「全部」進 `/marketplace/category/all`，第一頁顯示 24 筆
- [x] 6.3 按「載入更多」可載入下一批，到底時顯示「已載入全部」
- [x] 6.4 任一分類頁（productivity 等）也有「全部」入口可跳轉
- [x] 6.5 任一分類頁也是 24 筆 + 載入更多分頁
- [x] 6.6 active 樣式正確：在 /all 時「全部」反白；在 /productivity 時 productivity 反白

## Task 7: 收尾
- [x] 7.1 Changelog v0.34.0「首頁分類新增『全部』入口 + 所有分類頁分頁」
- [x] 7.2 `openspec validate add-all-tools-category --strict` 通過
- [x] 7.3 archive

## 依賴關係

```
Task 1 ─┬─ Task 2 ─┐
        │          ├── Task 3 ── Task 4 ── Task 5 ── Task 6 ── Task 7
        └──────────┘
```
