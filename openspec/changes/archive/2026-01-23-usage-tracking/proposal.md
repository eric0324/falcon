# Proposal: Usage Tracking

## Summary
Track tool usage (opens, duration) for analytics and ranking purposes.

## Why
- 需要追蹤工具使用次數以建立有意義的排名
- 使用時長數據幫助了解工具的實際使用情況
- 來源追蹤 (marketplace/direct/share) 幫助分析流量來源
- 聚合統計數據支援 Marketplace 的熱門/推薦功能

## What Changes
- 新增 `prisma/schema.prisma` - ToolUsage model 和 UsageSource enum
- 新增 `src/app/api/tools/[id]/usage/route.ts` - Usage API (POST/PATCH)
- 新增 `src/hooks/use-tool-usage.ts` - 客戶端追蹤 hook
- 新增 `src/components/tool-usage-tracker.tsx` - 無 UI 追蹤元件
- 更新 `src/app/tool/[id]/page.tsx` - 整合 ToolUsageTracker

## Motivation
To build meaningful rankings and help users discover popular tools, we need to track how often tools are used and for how long.

## Scope

### In Scope
- ToolUsage model and API
- Record usage on tool open
- Track session duration
- ToolStats aggregation
- Source tracking (direct, share, marketplace)

### Out of Scope
- Displaying stats in UI (separate change)
- Rankings calculation
- Real-time analytics dashboard

## Success Criteria
- [x] Usage recorded when tool is opened
- [x] Duration tracked on page unload
- [x] ToolStats updated with aggregates
- [x] Source of visit tracked

## Dependencies
- `tool-execution` change completed

## Timeline
2-3 hours
