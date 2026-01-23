# Proposal: Ratings & Reviews

## Summary
Allow users to rate tools (1-5 stars) and write reviews with author replies.

## Why
- 評分和評論幫助使用者發現高品質工具
- 提供回饋機制讓創作者持續改進工具
- IMDB 加權評分公式防止少量評分造成排名偏差

## What Changes
- 新增 `prisma/schema.prisma` - Review, ReviewReply 模型
- 新增 `src/components/star-rating.tsx` - 互動式星星選擇器
- 新增 `src/components/review-form.tsx` - 評論表單
- 新增 `src/components/review-section.tsx` - 評論區段管理
- 新增 `src/components/review-list.tsx` - 評論列表顯示
- 新增 `src/app/api/tools/[id]/reviews/route.ts` - 評論 CRUD API
- 新增 `src/app/api/reviews/[reviewId]/reply/route.ts` - 作者回覆 API
- 更新 `src/app/tool/[id]/details/page.tsx` - 整合評論區段

## Motivation
Ratings and reviews help users discover quality tools and provide feedback to creators. This creates a feedback loop that improves tool quality over time.

## Scope

### In Scope
- Review model with rating and comment
- Rating component (star picker)
- Review list display
- Author reply functionality
- Average rating calculation
- One-review-per-user constraint

### Out of Scope
- Review moderation
- Upvote/downvote reviews
- Review reporting

## Success Criteria
- [x] User can rate a tool (1-5 stars)
- [x] User can write optional comment
- [x] Author can reply to reviews
- [x] Average rating calculated and displayed
- [x] Each user can only review once per tool

## Dependencies
- `tool-execution` change completed
- `usage-tracking` change completed (for ToolStats)

## Timeline
4-5 hours
