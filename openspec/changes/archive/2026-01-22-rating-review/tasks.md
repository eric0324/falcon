# Tasks: Ratings & Reviews

## 1. Database Schema
- [x] 1.1 Create Review model with rating, content, timestamps
- [x] 1.2 Create ReviewReply model for author replies
- [x] 1.3 Add averageRating, totalReviews, weightedRating to ToolStats
- [x] 1.4 Add @@unique([toolId, userId]) constraint
- [x] 1.5 Run migration

## 2. Review API
- [x] 2.1 GET `/api/tools/[id]/reviews` - List reviews
  - Include user name, image
  - Include replies with user info
  - Support sort (newest, rating)
- [x] 2.2 POST `/api/tools/[id]/reviews` - Create/Update review (upsert)
  - Validate rating 1-5
  - One-per-user via upsert
- [x] 2.3 DELETE `/api/tools/[id]/reviews` - Delete own review
- [x] 2.4 Update ToolStats on review changes

## 3. Reply API
- [x] 3.1 POST `/api/reviews/[reviewId]/reply` - Author reply
  - Verify user is tool author
  - Create ReviewReply record
- [x] 3.2 DELETE `/api/reviews/[reviewId]/reply` - Delete own reply

## 4. Rating Component
- [x] 4.1 Create StarRating component (`src/components/star-rating.tsx`)
- [x] 4.2 Interactive star picker (hover, click)
- [x] 4.3 Display-only mode (readonly prop)
- [x] 4.4 Three sizes (sm, md, lg)
- [ ] 4.5 Half-star support for averages (deferred)

## 5. Review Form
- [x] 5.1 Create ReviewForm component
- [x] 5.2 Star rating selector (required)
- [x] 5.3 Comment textarea (optional)
- [x] 5.4 Submit button with loading state
- [x] 5.5 Edit mode for existing review (existingReview prop)

## 6. Review List
- [x] 6.1 Create ReviewList component
- [x] 6.2 Display reviewer info (avatar, name)
- [x] 6.3 Show rating stars and comment
- [x] 6.4 Show timestamp (relative time with date-fns)
- [x] 6.5 Display replies nested under review
- [x] 6.6 Add reply button (for author only)
- [x] 6.7 Inline reply form with textarea

## 7. Average Rating Calculation
- [x] 7.1 Calculate average on review create/update/delete
- [x] 7.2 IMDB weighted rating formula:
  ```typescript
  // v = votes, m = 10, R = avg rating, C = 3.0
  weightedRating = (v/(v+m)) * R + (m/(v+m)) * C
  ```
- [x] 7.3 Display on MarketplaceToolCard
- [x] 7.4 Display on ToolStats component

## 8. Tool Detail Integration
- [x] 8.1 Add ReviewSection to tool details page
- [x] 8.2 Show average rating and review count
- [x] 8.3 Check if user already reviewed (existingReview)
- [x] 8.4 Check if user is owner (canReview logic)
- [ ] 8.5 Load reviews with pagination (deferred)

## 9. Additional Features
- [x] 9.1 Sort reviews by newest or rating
- [x] 9.2 Empty state for no reviews
- [x] 9.3 Author badge on replies
- [ ] 9.4 Review moderation (out of scope)
- [ ] 9.5 Upvote/downvote reviews (out of scope)
