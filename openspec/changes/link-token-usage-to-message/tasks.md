# Tasks: link-token-usage-to-message

## 1. Schema Migration
- [ ] 移除 `ConversationMessage.model` 欄位
- [ ] 移除 `TokenUsage.conversationId` 及其 relation、index
- [ ] 移除 `Conversation.tokenUsages` relation
- [ ] 新增 `TokenUsage.conversationMessageId` (optional FK → ConversationMessage)
- [ ] 新增 `ConversationMessage.tokenUsages` relation
- [ ] 新增 `@@index([conversationMessageId])` 在 TokenUsage
- [ ] 執行 `prisma migrate dev` 產生 migration
- **驗證**: migration 成功，`npx prisma generate` 無錯誤

## 2. 更新 Message type 與 conversation-messages.ts
- [ ] `Message` type：移除 `model`，新增 optional `tokenUsage`
- [ ] `getMessages`: include `tokenUsages`，回傳每則 assistant message 的 token 資訊
- [ ] `replaceMessages`: 移除 `model` 寫入，回傳新建的 assistant message IDs
- [ ] `createConversationWithMessages`: 移除 `model` 寫入，回傳 assistant message IDs
- **驗證**: 更新 `conversation-messages.test.ts`

## 3. 更新 Conversations API
- [ ] `POST /api/conversations`: 用 assistant message IDs 將 orphan `TokenUsage` 關聯到 message
- [ ] `PATCH /api/conversations/:id`: 同上
- [ ] `GET /api/conversations/:id`: 回傳含 tokenUsage 的 messages
- **驗證**: 更新 `conversations/route.test.ts` 和 `conversations/[id]/route.test.ts`

## 4. 更新 Chat API
- [ ] `TokenUsage.create` 移除 `conversationId`，只保留 `userId`
- **驗證**: 確認 TokenUsage 仍正確寫入

## 5. 更新 Admin API
- [ ] `GET /api/admin/members/:id/conversations`: token aggregation 改為 join through ConversationMessage
- **驗證**: 更新 `admin/members/[id]/conversations/route.test.ts`

## 6. 清理與驗證
- [ ] 確認所有測試通過 (`npm test`)
- [ ] 手動驗證：新對話 → TokenUsage 有 conversationMessageId
