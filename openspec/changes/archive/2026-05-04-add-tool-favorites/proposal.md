# Proposal: 工具收藏功能

## 概述

讓使用者能在 marketplace 卡片或工具詳細頁點愛心收藏喜歡的工具，首頁新增「我的收藏」tab，顯示自己收藏過的工具（按收藏時間最新排序）。收藏狀態跨頁同步，全站任何工具卡片皆可一鍵收藏 / 取消。

## 動機

- 使用者反覆使用某些工具，每次都要從 trending / search 找一遍
- 沒有「快速取得常用工具」的入口，使用者體驗摩擦大
- 收藏是 marketplace 類產品的標配功能（GitHub stars、ChatGPT GPTs 收藏），使用者有預期
- 也可以累積收藏資料，未來做「相似工具推薦」等延伸功能

## 目標

1. 新增 `ToolFavorite` table，per-user-per-tool 唯一收藏紀錄
2. 工具卡片右上角顯示愛心 icon，未收藏為線條 / 已收藏為實心
3. 工具詳細頁顯示收藏按鈕
4. 首頁多一個「我的收藏」tab，以收藏時間 desc 排序
5. 點愛心 → 樂觀更新（optimistic update）+ API 呼叫；失敗時還原
6. 涵蓋全站所有使用 `MarketplaceToolCard` 的地方（首頁 + category + search + leaderboard）

## 非目標

- 不做收藏分組 / 標籤（v2 再說）
- 不做收藏匯出 / 匯入
- 不做收藏分享 / 公開收藏清單
- 不做收藏數量上限
- 不做收藏通知（例如收藏的工具更新時通知）
- 不做未登入訪客的「臨時收藏」（必須登入）

## 影響範圍

### 需修改的檔案

| 檔案 | 說明 |
|------|------|
| `prisma/schema.prisma` | 新增 `ToolFavorite` model + User / Tool relation + migration |
| `src/components/marketplace-tool-card.tsx` | 新增 `isFavorited` prop 與愛心 toggle，內部處理 optimistic update |
| `src/app/(app)/page.tsx` | 加第 6 個 tab「我的收藏」，server-side query 收藏列表；同時 query 收藏 id set 傳給其他 tab 卡片 |
| `src/app/(app)/marketplace/category/[id]/page.tsx` | server 端 query 收藏 id set 並傳卡片 |
| `src/app/(app)/marketplace/search/page.tsx` | 同上 |
| `src/app/(app)/marketplace/leaderboard/page.tsx` | 同上 |
| `src/app/(app)/tool/[id]/details/page.tsx` | 加收藏按鈕（與 share-button 並列） |

### 新增的檔案

| 檔案 | 說明 |
|------|------|
| `src/app/api/tools/[id]/favorite/route.ts` | POST 收藏（idempotent）/ DELETE 取消收藏（idempotent） |
| `src/lib/tool-favorites.ts` | 共用查詢：`getFavoriteToolIds(userId)`、`getFavoritedTools(userId)` |
| `src/app/(app)/tool/[id]/details/favorite-button.tsx` | client 端收藏按鈕元件 |
| `src/__tests__/tool-favorites/*` 或同位置 `.test.ts` | 單元 + 整合測試 |

## 風險

| 風險 | 緩解措施 |
|------|---------|
| 全站 4 頁 + 詳細頁都要改，工程量大 | 抽 `getFavoriteToolIds` 共用函式；卡片元件接受 `isFavorited` prop，呼叫端責任最小 |
| 收藏 tab 為空時 UX 不友善 | 空狀態文案：「還沒有收藏任何工具，去探索看看」+ CTA 連回 trending tab |
| 樂觀更新 + 失敗回滾的 race condition | 同一張卡片在 in-flight 期間 disable 愛心按鈕；失敗時 toast 提示並還原狀態 |
| 收藏的工具被作者刪除 → 收藏紀錄變孤兒 | DB schema 用 `onDelete: Cascade`，工具刪除時連帶清掉收藏 |
| 收藏的工具變成 PRIVATE，使用者已不能存取 | `getFavoritedTools` 套用 `buildVisibilityFilter`，已不可見的不顯示在 tab（DB 紀錄保留，待之後可重新可見） |

## 驗收標準

1. 已登入使用者點任一卡片右上愛心 → icon 變實心、收藏紀錄寫入 DB；再點一次 → 變回線條、紀錄刪除
2. 點愛心後立即視覺更新（不等 API），失敗時還原 + toast 顯示錯誤
3. 工具詳細頁有收藏按鈕，行為一致
4. 首頁多一個「我的收藏」tab；無收藏時顯示空狀態 + CTA
5. 在「我的收藏」tab 點取消收藏 → 卡片從清單即時移除
6. 收藏排序：最新收藏的排最前
7. 收藏的工具被原作者刪除 → 該收藏紀錄自動清除（Cascade）
8. 工具變成不可見（PRIVATE / GROUP / company 範圍變更）→ 該工具從收藏 tab 隱藏，但 DB 紀錄保留
9. 跨 4 個 marketplace 頁面 + 詳細頁，愛心狀態都正確
10. 單元測試覆蓋 API（POST 重複呼叫 idempotent / DELETE 不存在 idempotent / 跨使用者隔離）
