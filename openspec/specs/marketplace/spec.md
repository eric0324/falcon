# Marketplace Specification

## Purpose
Internal tool marketplace for discovering, rating, and reviewing tools created by colleagues.
## Requirements
### Requirement: Marketplace Browse
The system SHALL provide a browsable marketplace of shared tools with category-based filtering and pagination via load-more on every category page (including the "全部" pseudo-category).

#### Scenario: View homepage
- WHEN a user opens the marketplace
- THEN display: trending tools, newest tools, and category navigation (including an "全部" entry)

#### Scenario: Filter by category
- WHEN a user selects a category (財務, 人事, 數據, etc.)
- THEN only tools in that category are displayed
- AND pagination via 載入更多 is available

#### Scenario: Browse all tools without filter
- WHEN a user selects the 全部 pill
- THEN tools from all categories are displayed
- AND pagination via 載入更多 is available

#### Scenario: Search tools
- WHEN a user enters a search query
- THEN tools matching name, description, or tags are returned

### Requirement: Tool Rankings
The system MUST calculate and display tool rankings.

#### Scenario: Weekly trending
- GIVEN tools have usage data
- WHEN displaying "本週熱門"
- THEN sort by usage count in the current week (descending)

#### Scenario: Highest rated
- GIVEN tools have at least 10 reviews
- WHEN displaying "最高評價"
- THEN sort by weighted average rating (IMDB formula)

#### Scenario: Most used
- WHEN displaying "使用最多"
- THEN sort by total cumulative usage (descending)

### Requirement: Tool Details
The system SHALL show comprehensive tool information.

#### Scenario: View tool details
- WHEN a user opens a tool detail page
- THEN display: name, author, department, rating, usage count, description, tags, reviews

#### Scenario: View author profile
- WHEN clicking on author name
- THEN show author's other published tools

### Requirement: Usage Tracking
The system MUST track tool usage for analytics.

#### Scenario: Record usage
- WHEN a user opens a tool
- THEN create a ToolUsage record with userId, toolId, timestamp

#### Scenario: Track duration
- WHEN a user leaves a tool
- THEN update the usage record with duration in seconds

### Requirement: Rating System
The system SHALL allow users to rate tools.

#### Scenario: Submit rating
- WHEN a user rates a tool (1-5 stars)
- THEN the rating is saved
- AND the tool's average rating is recalculated

#### Scenario: One rating per user
- WHEN a user has already rated a tool
- THEN they can update their rating but not create a duplicate

### Requirement: Review System
The system SHALL allow users to write and respond to reviews.

#### Scenario: Submit review
- WHEN a user writes a review
- THEN the review is saved with rating, comment, and timestamp

#### Scenario: Author reply
- WHEN the tool author replies to a review
- THEN the reply is displayed under the original review

#### Scenario: View reviews
- WHEN viewing a tool's reviews
- THEN display reviews sorted by newest first
- AND show rating, author name, department, date, and any replies

### Requirement: Paginated Category View
Every category page — including the new "全部 (All)" entry — SHALL load the initial 24 tools server-side and provide a "載入更多" (Load More) button that fetches the next batch from `/api/marketplace` on the client. This keeps the initial page weight low and allows the marketplace to scale to thousands of tools without freezing the SSR.

#### Scenario: Initial SSR renders first 24 tools
- GIVEN a user navigates to any `/marketplace/category/:id` (including `:id = "all"`)
- WHEN the page renders on the server
- THEN at most 24 tools are queried (`take: 24`) ordered by `createdAt` descending
- AND `prisma.tool.count` is also called with the same `where` clause to compute `hasMore`

#### Scenario: All-categories case skips the category filter
- GIVEN the route param `:id` equals `all`
- WHEN building the prisma `where` clause
- THEN no `category` constraint is included
- AND the visibility filter `buildVisibilityFilter(userId)` is still applied
- AND `notFound()` is NOT called (the literal `all` is treated as a valid pseudo-category)

#### Scenario: Regular category case keeps the category filter
- GIVEN the route param `:id` equals a value in `TOOL_CATEGORIES` (e.g., `productivity`)
- WHEN building the prisma `where` clause
- THEN `category: ":id"` is included alongside the visibility filter

#### Scenario: Unknown non-`all` id is not found
- GIVEN the route param `:id` is neither `all` nor any value in `TOOL_CATEGORIES`
- WHEN the page handler runs
- THEN `notFound()` is invoked

#### Scenario: Load more appends the next batch
- GIVEN the initial 24 tools are rendered and `hasMore` is true
- WHEN the user clicks 載入更多
- THEN a request is sent to `GET /api/marketplace?section=newest&limit=24&offset=${currentLength}`
- AND for non-`all` pages, `&category=${categoryId}` is appended
- AND on success, the response's tools are appended to the existing grid
- AND the offset for the next click increments by the batch size

#### Scenario: End of list shows static label
- GIVEN the user has clicked 載入更多 until the response indicates `hasMore=false`
- WHEN the response is processed
- THEN the button is replaced with the non-interactive label 已載入全部

#### Scenario: Load more handles failure gracefully
- GIVEN a load-more request fails (network error or non-2xx response)
- WHEN the error is caught
- THEN a toast notification is shown
- AND the button remains clickable so the user can retry
- AND already-loaded tools are not removed

#### Scenario: Empty state messages differ by branch
- GIVEN the initial SSR returns zero tools
- WHEN rendering the grid
- THEN for `:id = "all"` the message reads 「目前沒有可顯示的工具」
- AND for a regular category the message reads 「這個分類還沒有工具」 with a sub-line 「成為第一個在此分類發布工具的人吧！」

### Requirement: All-Tools Entry in Category Navigation
The marketplace navigation SHALL surface an "All" pill in front of the regular category pills, both on the homepage and inside each category page, so users can switch back to a category-agnostic listing in one click.

#### Scenario: Homepage exposes the All entry
- WHEN a user opens the homepage (`/`)
- THEN the Categories section renders 🌐 全部 as the first pill
- AND the pill links to `/marketplace/category/all`
- AND the remaining `TOOL_CATEGORIES` pills follow in their existing order

#### Scenario: Category page exposes the All entry
- WHEN a user opens any category page `/marketplace/category/:id`
- THEN the category pill row renders 🌐 全部 as the first pill
- AND links to `/marketplace/category/all`

#### Scenario: Active highlight on All pill
- GIVEN the user is on `/marketplace/category/all`
- WHEN the pill row renders
- THEN the 🌐 全部 pill carries the active style (filled background)
- AND every `TOOL_CATEGORIES` pill renders in the non-active style

#### Scenario: All pill not active on regular category pages
- GIVEN the user is on `/marketplace/category/productivity` (or any other regular category)
- WHEN the pill row renders
- THEN the 🌐 全部 pill renders in the non-active style
- AND the matching regular category pill is active

#### Scenario: All entry is translatable
- WHEN rendering the 全部 pill
- THEN the label is read from i18n key `categories.all`
- AND the value is 全部 in Traditional Chinese (zh-TW)
- AND the value is "All" in English (en)

## Data Model

```prisma
model ToolUsage {
  id            String   @id @default(cuid())
  tool          Tool     @relation(fields: [toolId], references: [id])
  toolId        String
  user          User     @relation(fields: [userId], references: [id])
  userId        String
  duration      Int?     // seconds
  source        String?  // marketplace, direct, share
  createdAt     DateTime @default(now())
  
  @@index([toolId, createdAt])
  @@index([userId, createdAt])
}

model Review {
  id            String   @id @default(cuid())
  tool          Tool     @relation(fields: [toolId], references: [id])
  toolId        String
  user          User     @relation(fields: [userId], references: [id])
  userId        String
  rating        Int      // 1-5
  comment       String?  @db.Text
  replies       ReviewReply[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@unique([toolId, userId])
  @@index([toolId, createdAt])
}

model ReviewReply {
  id            String   @id @default(cuid())
  review        Review   @relation(fields: [reviewId], references: [id])
  reviewId      String
  user          User     @relation(fields: [userId], references: [id])
  userId        String
  content       String   @db.Text
  createdAt     DateTime @default(now())
}

model ToolStats {
  id            String   @id @default(cuid())
  tool          Tool     @relation(fields: [toolId], references: [id])
  toolId        String   @unique
  totalUsage    Int      @default(0)
  uniqueUsers   Int      @default(0)
  avgRating     Float    @default(0)
  reviewCount   Int      @default(0)
  weeklyUsage   Int      @default(0)
  updatedAt     DateTime @updatedAt
}
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/marketplace | List tools with sorting/filtering |
| GET | /api/marketplace/trending | Get weekly trending tools |
| GET | /api/marketplace/categories | List categories with counts |
| GET | /api/tools/:id/stats | Get tool statistics |
| GET | /api/tools/:id/reviews | List reviews for a tool |
| POST | /api/tools/:id/reviews | Create review |
| PATCH | /api/tools/:id/reviews/:reviewId | Update review |
| POST | /api/tools/:id/reviews/:reviewId/reply | Reply to review |
| POST | /api/tools/:id/usage | Record tool usage |

## Tool Categories

| Category | Icon | Description |
|----------|------|-------------|
| 財務 | 💰 | 報帳、請款、預算 |
| 人事 | 👥 | 請假、考勤、招募 |
| 數據 | 📊 | 報表、查詢、分析 |
| 文件 | 📝 | 合約、範本、紀錄 |
| 專案 | 📋 | 看板、追蹤、排程 |
| 溝通 | 💬 | 公告、通知、回報 |
| 其他 | 🔧 | 未分類工具 |

## Ranking Algorithms

### Weighted Rating (IMDB Formula)
```typescript
function calculateWeightedRating(avgRating: number, reviewCount: number): number {
  const C = 3.5;  // 全站平均分
  const m = 10;   // 最低評價數門檻
  return (reviewCount / (reviewCount + m)) * avgRating + (m / (reviewCount + m)) * C;
}
```

### Trending Score
```typescript
function calculateTrendingScore(weeklyUsage: number, totalUsage: number, rating: number): number {
  const recencyWeight = 0.5;
  const popularityWeight = 0.3;
  const qualityWeight = 0.2;
  
  return (weeklyUsage * recencyWeight) + 
         (Math.log10(totalUsage + 1) * popularityWeight) + 
         (rating * qualityWeight);
}
```
