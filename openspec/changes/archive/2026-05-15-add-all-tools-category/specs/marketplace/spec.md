# Marketplace Spec Deltas — add-all-tools-category

## ADDED Requirements

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

## MODIFIED Requirements

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
