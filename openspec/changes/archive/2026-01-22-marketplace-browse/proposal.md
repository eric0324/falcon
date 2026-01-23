# Proposal: Marketplace Browse

## Summary
Create the marketplace homepage for discovering tools with categories, rankings, and search.

## Why
- 隨著工具數量增加，使用者需要一個方式來探索同事建立的實用工具
- 提供分類瀏覽、熱門排行和搜尋功能來提升工具發現效率
- 支援部門級可見性控制，確保資料安全

## What Changes
- 新增 `src/app/marketplace/page.tsx` - 市集首頁
- 新增 `src/app/marketplace/search/page.tsx` - 搜尋結果頁
- 新增 `src/app/marketplace/category/[id]/page.tsx` - 分類瀏覽頁
- 新增 `src/app/marketplace/leaderboard/page.tsx` - 排行榜頁
- 新增 `src/components/marketplace-tool-card.tsx` - 工具卡片元件
- 新增 `src/components/search-bar.tsx` - 搜尋欄元件
- 新增 `src/lib/categories.ts` - 分類定義
- 新增 `src/app/api/marketplace/route.ts` - Marketplace API

## Motivation
As more tools are created, users need a way to discover useful tools built by colleagues. The marketplace provides trending tools, category browsing, and search functionality.

## Scope

### In Scope
- Marketplace homepage layout
- Trending tools section
- Newest tools section
- Category navigation
- Category pages
- Search functionality
- Tool tags

### Out of Scope
- Leaderboard pages (separate change)
- Advanced filters
- Personalized recommendations

## Success Criteria
- [x] Marketplace homepage shows trending and newest tools
- [x] Users can browse by category
- [x] Users can search tools by name/description/tags
- [x] Tools display stats (rating, usage)
- [x] Category pages filter correctly

## Dependencies
- `tool-visibility` change completed
- `usage-tracking` change completed
- `rating-review` change completed

## Timeline
4-5 hours
