# Marketplace Specification

## Purpose
Internal tool marketplace for discovering, rating, and reviewing tools created by colleagues.

## Requirements

### Requirement: Marketplace Browse
The system SHALL provide a browsable marketplace of shared tools.

#### Scenario: View homepage
- WHEN a user opens the marketplace
- THEN display: trending tools, newest tools, and category navigation

#### Scenario: Filter by category
- WHEN a user selects a category (財務, 人事, 數據, etc.)
- THEN only tools in that category are displayed

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
