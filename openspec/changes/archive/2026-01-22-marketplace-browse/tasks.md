# Tasks: Marketplace Browse

## 1. Tool Categories & Tags
- [x] 1.1 Add category and tags to Tool model (prisma/schema.prisma)
- [x] 1.2 Define category constants (`src/lib/categories.ts`):
  - productivity (生產力工具) ⚡
  - data (數據分析) 📊
  - finance (財務會計) 💰
  - hr (人資管理) 👥
  - marketing (行銷業務) 📣
  - design (設計創意) 🎨
  - other (其他) 📦
- [x] 1.3 Add category selector to deploy dialog
- [x] 1.4 Add tags input
- [x] 1.5 Run migration

## 2. Marketplace API
- [x] 2.1 Create GET `/api/marketplace` route
- [x] 2.2 Implement sort options:
  - trending: by weeklyUsage desc
  - newest: by createdAt desc
  - top-rated: by weightedRating desc
  - most-used: by totalUsage desc
- [x] 2.3 Filter by category
- [x] 2.4 Full-text search on name, description, tags
- [x] 2.5 Visibility filtering (PUBLIC, COMPANY, DEPARTMENT)

## 3. Marketplace Homepage
- [x] 3.1 Create page (`src/app/marketplace/page.tsx`)
- [x] 3.2 Add to navigation (Navbar component)
- [x] 3.3 Implement layout with sections (SearchBar, Categories, Trending, Newest)

## 4. Trending Section
- [x] 4.1 Fetch top 6 tools by weeklyUsage
- [x] 4.2 Grid card layout (3 columns)
- [x] 4.3 "查看更多" link to leaderboard

## 5. Newest Section
- [x] 5.1 Fetch 6 most recent tools
- [x] 5.2 Same grid layout as trending
- [x] 5.3 "查看更多" link

## 6. Category Navigation
- [x] 6.1 Display all 7 categories with icons
- [x] 6.2 Link to category pages
- [x] 6.3 Horizontal flex layout with wrap

## 7. Category Pages
- [x] 7.1 Create page (`src/app/marketplace/category/[id]/page.tsx`)
- [x] 7.2 Fetch tools filtered by category
- [x] 7.3 Show other categories as quick navigation
- [x] 7.4 Display tool count
- [x] 7.5 Breadcrumb navigation (返回市集)

## 8. Search
- [x] 8.1 Create SearchBar component
- [x] 8.2 Create search results page (`src/app/marketplace/search/page.tsx`)
- [x] 8.3 Multi-condition OR search (name, description, tags)
- [x] 8.4 Display result count
- [x] 8.5 Empty state for no results

## 9. MarketplaceToolCard
- [x] 9.1 Create component with:
  - Tool name and category badge
  - Description (line-clamp-2)
  - Tags (max 3 + "+N")
  - Author avatar and name
- [x] 9.2 Display stats:
  - 👁 totalUsage
  - ⭐ averageRating (if > 0)
- [x] 9.3 Link to tool details page

## 10. Additional Features (超出原 Scope)
- [x] 10.1 Leaderboard page with 4 rankings
- [x] 10.2 Department-level visibility filtering
- [x] 10.3 Tool details page (`/tool/[id]/details`)
- [x] 10.4 UserAvatar component
- [x] 10.5 ToolStats component (compact and full modes)
