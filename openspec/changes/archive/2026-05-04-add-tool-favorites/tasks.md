# Tasks: 工具收藏功能

## Task 1: 資料層
- [x] 在 `prisma/schema.prisma` 新增 `ToolFavorite` model
  - [x] 欄位：id / userId / toolId / createdAt
  - [x] `@@unique([userId, toolId])`
  - [x] `@@index([userId, createdAt(sort: Desc)])`
  - [x] `@@index([toolId])`
- [x] 在 `User` 加 `toolFavorites ToolFavorite[]`
- [x] 在 `Tool` 加 `favorites ToolFavorite[]`
- [x] 跑 migration（順手修了 SystemConfig.updatedAt 的歷史 drift）

## Task 2: 共用查詢函式
- [x] 建立 `src/lib/tool-favorites.ts`
  - [x] `getFavoriteToolIds(userId: string): Promise<Set<string>>`
  - [x] `getFavoritedTools(userId: string, opts?: { take?: number })`：套用 `buildVisibilityFilter`，按 createdAt desc
- [x] 撰寫單元測試（7 tests pass）：
  - [x] `getFavoriteToolIds` 回傳正確 Set
  - [x] `getFavoritedTools` 排除不可見工具
  - [x] 排序為 createdAt desc
  - [x] take 參數預設 12

## Task 3: 收藏 API
- [x] 建立 `src/app/api/tools/[id]/favorite/route.ts`
  - [x] POST：idempotent upsert，回 `{ favorited: true }`
  - [x] DELETE：idempotent deleteMany，回 `{ favorited: false }`
  - [x] 兩個方法都檢查 session，沒登入回 401
  - [x] POST 檢查工具存在 + 對使用者可見（套 `buildVisibilityFilter`），不可見回 404
- [x] 整合測試（7 tests pass）：
  - [x] POST 第一次寫入 / 第二次仍 200（idempotent）
  - [x] DELETE 第一次刪除 / 第二次仍 200（idempotent）
  - [x] 未登入回 401
  - [x] 工具不存在或不可見回 404

## Task 4: 卡片元件改造
- [x] 建立共用 `src/components/tool-favorite-button.tsx`（卡片 + 詳細頁共用）
  - [x] 內部 useState 維護 favorited / pending state
  - [x] 點擊：optimistic update + fetch POST/DELETE + 失敗回滾 + toast
  - [x] 401 → toast 並導 /login
  - [x] `onChange` callback 通知父元件
- [x] 修改 `src/components/marketplace-tool-card.tsx`
  - [x] 接 `isFavorited?: boolean` 與 `onFavoriteChange?: (favorited: boolean) => void`
  - [x] 卡片右上 category badge 旁加愛心 button
- 元件 render 測試略（專案無 jsdom 環境，行為靠 API 測試 + 手動驗證覆蓋）

## Task 5: Server pages 整合
- [x] 建立 `src/components/my-favorites-grid.tsx`（client）— 收藏 tab 移除取消收藏的卡片
- [x] 修改 `src/app/(app)/page.tsx`
  - [x] 同步 query 收藏 id set + 收藏列表
  - [x] 加第 6 個 TabsTrigger「我的收藏」（icon: Heart）
  - [x] 加 TabsContent 用 `MyFavoritesGrid`
  - [x] 空狀態 + CTA 連回首頁（grid 內處理）
  - [x] 既有 5 個 tab 的卡片都接收 isFavorited prop
- [x] 修改 `src/app/(app)/marketplace/category/[id]/page.tsx`
  - [x] query 收藏 id set 並傳卡片
- [x] 修改 `src/app/(app)/marketplace/search/page.tsx`
- [x] 修改 `src/app/(app)/marketplace/leaderboard/page.tsx`

## Task 6: 工具詳細頁按鈕
- [x] 直接複用 `ToolFavoriteButton`（不必另建 favorite-button.tsx）
- [x] 修改 `src/app/(app)/tool/[id]/details/page.tsx`
  - [x] server-side 查目前收藏狀態
  - [x] 在 share-button 旁加 FavoriteButton（size="md"）

## Task 7: i18n 文案
- [x] `src/i18n/messages/zh-TW/marketplace.json` 加 `tabs.favorites`
- [x] `src/i18n/messages/en/marketplace.json` 同步加 `tabs.favorites`

## Task 8: 驗證
- [x] `openspec validate add-tool-favorites --strict --no-interactive` 通過
- [x] 所有單元 / 整合測試綠燈
- [x] 全套 vitest 無 regression（64 files / 670 tests 全綠）
- [x] `bunx tsc --noEmit` 乾淨
- [~] 手動測試：留給使用者實機驗證（不影響 commit / archive）
- [x] commit + `openspec archive add-tool-favorites --yes`

## 依賴關係

```
Task 1 (DB) → Task 2 (lib) → Task 3 (API) ┐
                            → Task 4 (card) ┘
                                            ↘
                                              Task 5 / 6 (page 整合)
                                                ↓
                                              Task 7 (i18n)
                                                ↓
                                              Task 8 (驗證 + archive)
```
