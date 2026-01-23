# Tasks: Claude API Integration

## 1. API Route Setup
- [x] 1.1 Install Anthropic SDK
  ```bash
  pnpm add @anthropic-ai/sdk
  ```
- [x] 1.2 Create chat API route (`src/app/api/chat/route.ts`)
- [x] 1.3 Initialize Anthropic client with API key
- [x] 1.4 Implement POST handler for messages

## 2. System Prompt
- [x] 2.1 Define system prompt (內嵌於 `src/app/api/chat/route.ts`)
- [x] 2.2 Define tool generation rules:
  - 繁體中文回應
  - 單一 React 元件 (export default App)
  - Tailwind CSS
  - 內建 window.companyAPI 使用範例
- [x] 2.3 Make available APIs configurable via `generateDataSourcePrompt()`

## 3. Streaming Response
- [x] 3.1 Implement streaming with `client.messages.stream()`
- [x] 3.2 Return ReadableStream from API route
- [x] 3.3 Handle stream chunks on client side (`reader.read()`)
- [x] 3.4 Update message content incrementally

## 4. Client Integration
- [x] 4.1 Implement chat state management in `studio/page.tsx`
- [x] 4.2 Implement `handleSubmit` function:
  ```typescript
  // Add user message to state
  // Call /api/chat with full history
  // Stream assistant response
  ```
- [x] 4.3 Handle conversation history (傳送完整 messages 陣列)
- [x] 4.4 Include currentCode context in requests

## 5. Code Extraction
- [x] 5.1 Create `extractCode` function in `studio/page.tsx`
- [x] 5.2 Parse ```jsx/tsx/js code blocks from response
- [x] 5.3 Extract code in real-time during streaming
- [x] 5.4 Auto-update PreviewPanel with extracted code

## 6. Error Handling
- [x] 6.1 Handle API errors (auth check, network)
- [x] 6.2 Display user-friendly error messages via toast
- [x] 6.3 Remove failed message from chat on error
- [ ] 6.4 Add timeout handling (未實作，依賴 Anthropic SDK 預設)

## 7. Rate Limiting
- [ ] 7.1 Track requests per user (deferred - optional for MVP)
- [ ] 7.2 Display warning when approaching limit (deferred)
- [ ] 7.3 Queue requests if needed (deferred)

## 8. Additional Features (超出原 Scope)
- [x] 8.1 Dynamic data source prompt based on user department
- [x] 8.2 Chat message formatting (hide code blocks, show status)
- [x] 8.3 Edit mode - load existing tool conversation
- [x] 8.4 Real-time code preview during streaming
