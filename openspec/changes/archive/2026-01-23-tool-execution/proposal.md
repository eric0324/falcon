# Proposal: Tool Execution Page

## Summary
Create the page where deployed tools are executed in a sandboxed environment.

## Why
- 使用者部署工具後需要專用頁面來執行工具
- 獨立於 Studio 編輯環境，提供乾淨的執行體驗
- Sandpack 沙箱環境確保安全執行
- 需支援 Mock API 和真實 API Bridge 兩種模式

## What Changes
- 新增 `src/app/tool/[id]/page.tsx` - 工具執行頁面
- 新增 `src/components/tool-runner.tsx` - Sandpack 執行元件
- 新增 `src/lib/sandbox-api-client.ts` - API Bridge 客戶端程式碼生成
- 支援 PRIVATE visibility 存取控制

## Motivation
After deployment, users need a dedicated page to use their tools. This page should render the tool in Sandpack with mock APIs, separate from the studio editing environment.

## Scope

### In Scope
- Tool execution page route
- Fetch and render tool code
- Sandpack execution environment
- Mock companyAPI (same as preview)
- Tool not found / access denied handling
- Basic tool header with name

### Out of Scope
- Real API bridge (mock only)
- Tool sharing / visibility
- Usage tracking
- Ratings / reviews

## Success Criteria
- [x] `/tool/[id]` renders the tool
- [x] Tool code executes in Sandpack
- [x] Mock APIs work correctly
- [x] Invalid tool ID shows 404
- [x] Page is standalone (no studio UI)

## Dependencies
- `tool-crud` change completed

## Timeline
2-3 hours
