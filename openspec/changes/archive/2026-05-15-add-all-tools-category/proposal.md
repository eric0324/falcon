# Proposal: 首頁分類列新增「全部」入口

## Why

首頁底部 Categories 區塊（`src/app/(app)/page.tsx:213-229`）目前只有 7 個分類膠囊（productivity / data / finance / hr / marketing / design / other）。使用者要瀏覽「整個公司有多少工具」必須逐一點開七個分類；上層的 Leaderboard tabs（trending / top-rated / most-used …）各自只顯示 12 筆 take-N，看不到完整清單。

少了一個「全部」入口讓使用者**無法在不指定分類的情況下瀏覽完整工具列表**。

## What Changes

新增「全部」入口 + 所有分類頁統一分頁：

1. **`src/app/(app)/page.tsx` 與 `marketplace/category/[id]/page.tsx`** 的 Categories 膠囊列最前面 prepend 一個按鈕：🌐 全部 → `/marketplace/category/all`
2. **`marketplace/category/[id]/page.tsx`** 加入 `id === "all"` 特例：不套用 `category` filter，列出該使用者 visibility 範圍內的所有工具
3. **所有分類頁分頁化（含「全部」與七個既有分類）**：page.tsx 初始 SSR 渲染前 24 筆，底部一個「載入更多」按鈕；點擊呼叫既有 `/api/marketplace` 帶 `offset` + 對應 `category` 參數補下 24 筆，append 到清單後；當 `hasMore=false` 時按鈕替換為「已載入全部」文字
4. **新增 `src/components/category-tools-grid.tsx`**：通用 client component，接 `category?: string`（undefined 表示「全部」）+ `emptyMessage` props，所有分類頁共用
5. **active 樣式**：在 `/marketplace/category/all` 時「全部」膠囊反白；其他分類頁面時對應分類反白、「全部」不反白
6. **i18n**：在 `categories` 區塊新增 `all` key（「全部」/「All」）

**BREAKING**: 無。`TOOL_CATEGORIES` 常數不變。既有分類頁從「一次撈全部」變成「24 筆 + 載入更多」，行為差異對使用者是「初始載入更快、分批顯示」，不破壞流程。

## Impact

- Affected specs: `marketplace` (MODIFIED — Marketplace Browse 加「全部」入口 + 所有分類頁分頁；ADDED — Paginated Category View)
- Affected code:
  - `src/app/(app)/page.tsx`：Categories 區塊 prepend「全部」連結
  - `src/app/(app)/marketplace/category/[id]/page.tsx`：`id === "all"` 特例 + 膠囊列 prepend「全部」+ active 樣式 + 統一改 take=24 + count + 用 CategoryToolsGrid 渲染
  - 新增 `src/components/category-tools-grid.tsx`：通用 client component 處理「載入更多」狀態，所有分類頁共用
  - i18n messages：`categories.all`（zh-TW / en）
- 不動 DB schema、不動 `/api/marketplace`（既有 API 已支援 offset/limit/category）、不動 `TOOL_CATEGORIES`
