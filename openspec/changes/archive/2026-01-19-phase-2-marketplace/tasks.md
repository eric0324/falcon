# Tasks: Marketplace & Social Features

## 1. Database Schema Updates
- [x] 1.1 Add category and tags fields to Tool model
- [x] 1.2 Create ToolUsage model
- [x] 1.3 Create Review model
- [x] 1.4 Create ReviewReply model
- [x] 1.5 Create ToolStats model
- [x] 1.6 Add avatar field to User model (using existing image field)
- [x] 1.7 Run migration
- [x] 1.8 Create database indexes for performance

## 2. Usage Tracking
- [x] 2.1 Create usage recording API (/api/tools/:id/usage)
- [x] 2.2 Instrument tool page to record opens
- [x] 2.3 Track duration with beforeunload event
- [x] 2.4 Add source tracking (marketplace, direct, share)
- [x] 2.5 Create usage aggregation job (update ToolStats) - integrated into usage API

## 3. Rating System
- [x] 3.1 Create rating component (star picker)
- [x] 3.2 Create rating API endpoint
- [x] 3.3 Implement one-rating-per-user constraint
- [x] 3.4 Calculate average rating on submit
- [x] 3.5 Display rating on tool cards

## 4. Review System
- [x] 4.1 Create review form component
- [x] 4.2 Create reviews API (CRUD)
- [x] 4.3 Build review list component
- [x] 4.4 Implement author reply functionality
- [x] 4.5 Add reply display under reviews
- [x] 4.6 Sort reviews by newest/rating

## 5. Tool Stats
- [x] 5.1 Create stats API endpoint
- [x] 5.2 Build stats display component (usage count, rating, reviews)
- [x] 5.3 Implement IMDB weighted rating formula
- [ ] 5.4 Create weekly usage reset job (deferred - requires cron/scheduler)
- [x] 5.5 Add trending score calculation

## 6. Marketplace Homepage
- [x] 6.1 Create marketplace page layout
- [x] 6.2 Build "本週熱門" section
- [x] 6.3 Build "最新上架" section
- [x] 6.4 Build category navigation grid
- [x] 6.5 Add search bar component
- [x] 6.6 Implement search API with filters

## 7. Tool Categories
- [x] 7.1 Create category constants (7 categories)
- [x] 7.2 Add category selector to tool deploy dialog
- [x] 7.3 Add tags input component
- [x] 7.4 Build category page with filtered tools
- [x] 7.5 Show category/tags on tool cards

## 8. Leaderboards
- [x] 8.1 Create leaderboard API endpoints (integrated in page)
- [x] 8.2 Build leaderboard page
- [x] 8.3 Implement "本週熱門" ranking
- [x] 8.4 Implement "最高評價" ranking (min 1 review for now)
- [x] 8.5 Implement "使用最多" ranking
- [x] 8.6 Implement "新星崛起" ranking (30-day window)
- [ ] 8.7 Add department filter for "部門精選" (deferred)

## 9. Tool Detail Page
- [x] 9.1 Create enhanced tool detail layout
- [x] 9.2 Display author info with avatar
- [x] 9.3 Show comprehensive stats
- [ ] 9.4 Add tool preview screenshot (deferred - requires screenshot service)
- [x] 9.5 Integrate reviews section
- [x] 9.6 Add share button
- [x] 9.7 Add "Use Tool" CTA

## 10. Visibility & Permissions
- [x] 10.1 Extend visibility enum (DEPARTMENT, COMPANY, PUBLIC)
- [x] 10.2 Update tool API to filter by visibility
- [x] 10.3 Add visibility selector to deploy dialog
- [x] 10.4 Implement department-based access check
- [ ] 10.5 Update tool cards to show visibility badge (deferred)

## 11. Navigation Updates
- [x] 11.1 Add marketplace link to header
- [x] 11.2 Update homepage to show "我的工具" tab
- [x] 11.3 Add breadcrumbs to tool pages
- [ ] 11.4 Create "探索更多" suggestions (deferred)

## 12. Polish & Performance
- [ ] 12.1 Add infinite scroll to tool lists (deferred)
- [x] 12.2 Implement tool card skeleton loading
- [ ] 12.3 Cache leaderboard results (5 min TTL) (deferred)
- [x] 12.4 Optimize database queries with includes
- [x] 12.5 Add empty states for no results
- [x] 12.6 Mobile-responsive marketplace layout
