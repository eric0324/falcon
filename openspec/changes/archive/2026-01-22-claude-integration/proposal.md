# Proposal: Claude API Integration

## Summary
Integrate Claude API for code generation with streaming responses and proper system prompting.

## Why
- 需要 AI 驅動的程式碼生成功能來建立內部工具
- 串流回應提供即時反饋，改善使用者體驗
- 結構化的 System Prompt 確保產出一致的 React 元件格式

## What Changes
- 新增 `src/app/api/chat/route.ts` - Claude Streaming API 路由
- 新增 System Prompt 定義（內嵌於 route.ts）
- 新增 `src/lib/generate-datasource-prompt.ts` - 動態資料源提示詞生成
- 更新 `src/app/studio/page.tsx` - 串流接收與程式碼擷取
- 新增 `src/components/chat-message.tsx` - 聊天訊息顯示元件

## Motivation
Claude powers the code generation. Need proper integration with streaming for good UX and structured system prompt to ensure consistent React component output.

## Scope

### In Scope
- Claude API route with streaming
- System prompt for tool generation
- Code extraction from responses
- Conversation context management
- Error handling and retries
- Rate limiting awareness

### Out of Scope
- Preview rendering (separate change)
- Tool saving (separate change)
- Conversation persistence to DB

## Success Criteria
- [x] Messages sent to Claude API successfully
- [x] Response streams back in real-time
- [x] Code blocks extracted from response
- [x] Conversation history maintained in context
- [x] Errors display user-friendly messages
- [x] System prompt produces valid React code

## Dependencies
- `studio-chat` change completed
- Anthropic API key configured

## Timeline
3-4 hours
