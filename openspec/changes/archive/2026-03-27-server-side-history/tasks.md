# Tasks: Server-Side History Loading

## Task 1: 新增 `appendMessages` 函式
- [ ] 在 `src/lib/conversation-messages.ts` 新增 `appendMessages(conversationId, messages)` 函式
- [ ] 查詢目前最大 `orderIndex`，從 `maxIndex + 1` 開始新增
- [ ] 回傳新增的 assistant message IDs
- [ ] 撰寫單元測試

## Task 2: 修改 Chat API Route — Server 端載入歷史與寫入
- [ ] 修改 `src/app/api/chat/route.ts`
- [ ] 接收 `message`（字串）取代 `messages`（陣列）
- [ ] 有 `conversationId` 時，使用 `getMessages()` 從 DB 載入歷史
- [ ] Streaming 結束後，使用 `appendMessages()` 寫入 user message + assistant response
- [ ] 撰寫整合測試

## Task 3: 修改客戶端 — 只傳新訊息
- [ ] 修改 `src/app/(app)/chat/page.tsx`
- [ ] `fetch("/api/chat")` 改為傳送 `{ conversationId, message, model, files, dataSources, skillPrompt }`
- [ ] 移除 streaming 結束後的 auto-save 邏輯（POST/PATCH `/api/conversations`）
- [ ] 保留從 chat API response 接收 `conversationId` 的邏輯

## Task 4: Nginx 配置建議
- [ ] 在專案根目錄新增 `nginx.conf.example`，包含 `client_max_body_size 5m` 設定
- [ ] 或在現有部署文件中記錄此設定
