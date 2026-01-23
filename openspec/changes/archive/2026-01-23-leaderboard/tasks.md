# Tasks: Leaderboards

## 1. Leaderboard Page
- [x] 1.1 Create page (`src/app/marketplace/leaderboard/page.tsx`)
- [x] 1.2 Add tab navigation for ranking types (Tabs component)
- [x] 1.3 Add to marketplace navigation (排行榜按鈕 with Trophy icon)
- [x] 1.4 Back button to marketplace

## 2. Ranking Queries
- [x] 2.1 Weekly trending: orderBy weeklyUsage desc
- [x] 2.2 Highest rated: orderBy weightedRating desc (min 1 review)
- [x] 2.3 Most used: orderBy totalUsage desc
- [x] 2.4 Rising stars: 30 days filter + weeklyUsage desc

## 3. Ranking Display
- [x] 3.1 Use MarketplaceToolCard for tool display
- [x] 3.2 Gold badge for top 3 (1, 2, 3)
- [x] 3.3 Grid layout (1/2/3 columns responsive)
- [x] 3.4 Empty state messages

## 4. Tab Implementation
- [x] 4.1 本週熱門 tab (TrendingUp icon)
- [x] 4.2 最高評價 tab (Star icon)
- [x] 4.3 使用最多 tab (Eye icon)
- [x] 4.4 新星崛起 tab (Sparkles icon)
- [x] 4.5 URL query param for tab state

## 5. Visibility Filtering
- [x] 5.1 Filter by PUBLIC, COMPANY visibility
- [x] 5.2 DEPARTMENT visibility filtered by user's department

## 6. Deferred
- [ ] 6.1 Weekly reset cron job
- [ ] 6.2 Position change indicator (↑ ↓)
- [ ] 6.3 Department filter dropdown
- [ ] 6.4 API caching (currently direct DB query)
