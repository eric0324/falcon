# Tasks: Usage Tracking

## 1. Database Schema
- [x] 1.1 Create ToolUsage model with toolId, userId, source, duration, createdAt
- [x] 1.2 Create UsageSource enum (MARKETPLACE, DIRECT, SHARE)
- [x] 1.3 Add ToolStats fields (totalUsage, weeklyUsage)
- [x] 1.4 Run migration

## 2. Usage API
- [x] 2.1 Create POST `/api/tools/[id]/usage` - Record new usage
- [x] 2.2 Create PATCH `/api/tools/[id]/usage` - Update duration
- [x] 2.3 Validate source (MARKETPLACE, DIRECT, SHARE)
- [x] 2.4 Create ToolUsage record
- [x] 2.5 Upsert ToolStats counters (totalUsage, weeklyUsage)

## 3. Client-side Tracking
- [x] 3.1 Create useToolUsage hook (`src/hooks/use-tool-usage.ts`)
- [x] 3.2 Record usage on mount with source
- [x] 3.3 Track duration with startTimeRef
- [x] 3.4 Use navigator.sendBeacon on beforeunload/pagehide
- [x] 3.5 Create ToolUsageTracker component (renderless)

## 4. Integration
- [x] 4.1 Add ToolUsageTracker to tool page (`src/app/tool/[id]/page.tsx`)
- [x] 4.2 Pass source prop (default: DIRECT)

## 5. Weekly Reset
- [ ] 5.1 Create reset function for weeklyUsage (deferred - cron job)
- [ ] 5.2 Schedule weekly cron job (deferred)
