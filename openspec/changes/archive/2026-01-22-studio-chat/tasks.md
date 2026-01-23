# Tasks: Studio Chat Interface

## 1. Studio Page Layout
- [x] 1.1 Create studio page (`src/app/studio/page.tsx`)
- [x] 1.2 Implement split-view layout (chat left w-1/2, preview right w-1/2)
- [ ] 1.3 Add responsive breakpoint (stack on mobile) - deferred
- [ ] 1.4 Create resizable divider between panels - deferred

## 2. Chat State Management
- [x] 2.1 Create messages state with useState
  ```typescript
  interface Message {
    role: 'user' | 'assistant';
    content: string;
  }
  const [messages, setMessages] = useState<Message[]>([]);
  ```
- [x] 2.2 Implement addMessage via setMessages
- [x] 2.3 Implement updateMessage for streaming (immutable update)
- [x] 2.4 Implement clearMessages via handleReset

## 3. Chat Panel Component
- [x] 3.1 Create chat panel within studio page
- [x] 3.2 Implement message list with auto-scroll (useEffect + scrollRef)
- [ ] 3.3 Add scroll-to-bottom button - deferred

## 4. Message Components
- [x] 4.1 Create ChatMessage component (`src/components/chat-message.tsx`)
- [x] 4.2 Style user messages (right-aligned, bg-primary)
- [x] 4.3 Style assistant messages (left-aligned, bg-muted)
- [x] 4.4 Add avatar/icon for each role (User / Bot icons)
- [x] 4.5 Hide code blocks, show "程式碼已生成" message
- [x] 4.6 Show streaming indicator ("正在生成程式碼...")

## 5. Message Input
- [x] 5.1 Create input form with Textarea
- [x] 5.2 Build textarea with min-height
- [x] 5.3 Add send button with Send icon
- [x] 5.4 Support Enter to send, Shift+Enter for newline (handleKeyDown)
- [x] 5.5 Disable input while loading
- [x] 5.6 Clear input after send

## 6. Loading States
- [x] 6.1 Show Loader2 spinner during response
- [x] 6.2 Show "產生中..." text when waiting
- [x] 6.3 Add Suspense fallback for initial page load

## 7. Empty State
- [x] 7.1 Create welcome message for new conversations
- [x] 7.2 Show tool name and selected data sources
- [ ] 7.3 Add clickable example prompts - deferred

## 8. Additional Features (超出原 Scope)
- [x] 8.1 InitialSetupDialog for tool name/data source selection
- [x] 8.2 DeployDialog for publishing tools
- [x] 8.3 Edit mode - load existing tool for editing
- [x] 8.4 Reset functionality
- [x] 8.5 Code extraction from Claude response
