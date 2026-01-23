# Proposal: Studio Chat Interface

## Summary
Build the chat interface for the Vibe Coding studio where users interact with Claude to describe their tools.

## Why
- 聊天介面是使用者與 AI 溝通需求的主要方式
- 需要支援串流回應和對話上下文管理
- 分割視圖讓使用者同時看到對話和預覽

## What Changes
- 新增 `src/app/studio/page.tsx` - Studio 頁面（分割佈局）
- 新增 `src/components/chat-message.tsx` - 聊天訊息元件
- 新增 `src/components/initial-setup-dialog.tsx` - 初始設定對話框
- 新增 `src/components/deploy-dialog.tsx` - 發布對話框
- 整合 ScrollArea、Textarea、Button 等 UI 元件

## Motivation
The chat interface is the primary way users communicate requirements. It needs to support streaming responses and maintain conversation context.

## Scope

### In Scope
- Studio page layout (split view)
- Chat message components (user/assistant bubbles)
- Message input with send functionality
- Streaming response display
- Conversation state management
- Loading states

### Out of Scope
- Claude API integration (separate change)
- Code preview panel (separate change)
- Tool saving (separate change)

## Success Criteria
- [x] Studio page renders with split layout
- [x] User can type and send messages
- [x] Messages appear in chat history
- [x] Loading indicator shows during "response"
- [x] Chat scrolls to latest message
- [ ] Responsive on mobile (stacked layout) - deferred

## Dependencies
- `project-setup` change completed
- `google-auth` change completed (for protected route)

## Timeline
3-4 hours
