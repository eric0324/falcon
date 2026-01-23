# Proposal: Tool CRUD Operations

## Summary
Implement create, read, update, delete operations for tools, including deploy dialog and tool management.

## Why
- 使用者需要儲存他們用 AI 建立的工具
- 發布流程讓使用者從 Studio 順利部署工具
- 首頁工具列表讓使用者管理自己的工具
- 編輯功能讓使用者能修改現有工具
- 對話紀錄保存讓編輯時能還原完整上下文

## What Changes
- 新增 `src/app/api/tools/route.ts` - 工具 API (GET list, POST create)
- 新增 `src/app/api/tools/[id]/route.ts` - 單一工具 API (GET, PATCH, DELETE)
- 新增 `src/components/deploy-dialog.tsx` - 發布對話框元件
- 更新 `src/app/studio/page.tsx` - 整合發布流程和編輯模式
- 更新 `src/app/(dashboard)/page.tsx` - 首頁顯示使用者工具
- 新增 `src/components/tool-card.tsx` - 工具卡片元件
- 整合對話紀錄儲存與載入

## Motivation
Users need to save their created tools and manage them. This includes the deploy flow from studio and the homepage tool listing.

## Scope

### In Scope
- Tool API routes (CRUD)
- Deploy dialog in studio
- Homepage with tool list
- Tool card component
- Edit tool flow
- Delete confirmation
- Conversation saving with tool

### Out of Scope
- Tool visibility settings (PRIVATE only for now)
- Sharing tools
- Tool execution page (separate change)

## Success Criteria
- [x] User can deploy tool from studio with name/description
- [x] Tool saved to database with code and conversation
- [x] Homepage shows user's tools
- [x] User can delete a tool
- [x] User can edit tool (re-enter studio with context)

## Dependencies
- `sandpack-preview` change completed
- Database models from `project-setup`

## Timeline
4-5 hours
