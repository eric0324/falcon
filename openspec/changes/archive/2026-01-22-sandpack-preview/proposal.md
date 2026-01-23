# Proposal: Sandpack Preview Panel

## Summary
Implement real-time code preview using Sandpack to display generated React components.

## Why
- 使用者需要即時視覺回饋來查看 Claude 生成的程式碼效果
- Sandpack 提供安全的沙箱環境執行不受信任的 React 程式碼
- Hot-reload 功能讓開發體驗更流暢

## What Changes
- 新增 `src/components/preview-panel.tsx` - 開發模式預覽元件
- 新增 `src/components/tool-runner.tsx` - 生產模式執行元件
- 新增 `src/lib/sandbox-api-client.ts` - API Bridge 客戶端生成
- 新增 `src/hooks/use-api-bridge.ts` - PostMessage 事件管理
- 新增 `src/app/api/bridge/route.ts` - 後端 Bridge API
- 新增 `src/lib/connectors/` - 資料庫連接器 (postgres, mysql, rest-api)

## Motivation
Users need immediate visual feedback as Claude generates code. Sandpack provides a secure sandbox for rendering untrusted React code with hot-reload capability.

## Scope

### In Scope
- Sandpack setup with React template
- Preview panel component
- Code hot-reload on changes
- Error boundary for invalid code
- Mock companyAPI injection
- Loading and error states

### Out of Scope
- Real API calls from preview (mock only)
- Tool deployment
- Code editing by user

## Success Criteria
- [x] Preview panel renders Sandpack
- [x] Code updates trigger hot-reload
- [x] Invalid code shows error message
- [x] window.companyAPI available in sandbox
- [x] Preview is responsive

## Dependencies
- `studio-chat` change completed
- `claude-integration` change completed

## Timeline
3-4 hours
