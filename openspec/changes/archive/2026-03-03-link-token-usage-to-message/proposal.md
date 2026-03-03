# Proposal: link-token-usage-to-message

## Summary

將 `TokenUsage` 從關聯到 `Conversation` 改為關聯到 `ConversationMessage`，並移除 `ConversationMessage.model` 欄位（因為 `TokenUsage.model` 已記錄此資訊）。`Conversation.model` 保留作為使用者的 model 偏好設定。

## Motivation

目前的問題：
1. `ConversationMessage.model` 永遠是 `null` — 前端存訊息時從未帶入 model 值
2. `TokenUsage` 只關聯到 `Conversation`，無法知道每一輪對話（每則 assistant message）消耗了多少 token
3. 同一個對話中使用者可能切換 model，但目前無法追蹤每則回覆實際使用的 model

## Changes

### Schema
- **移除** `ConversationMessage.model` 欄位
- **移除** `TokenUsage.conversationId`（不再需要）
- **新增** `TokenUsage.conversationMessageId`（optional FK → ConversationMessage）
- **保留** `Conversation.model` 作為 model 偏好

### Chat API (`/api/chat`)
- `TokenUsage` 寫入時不再帶 `conversationId`，僅帶 `userId`（orphan record）

### Conversation API
- `replaceMessages` / `createConversationWithMessages` 移除 model 欄位的寫入，回傳 assistant message IDs
- POST/PATCH 時將 orphan `TokenUsage`（無 `conversationMessageId`）關聯到對應的 assistant message
- `getMessages` join `TokenUsage` 取得每則訊息的 model 和 token 數

### Admin API
- 調整 token aggregation 查詢，透過 `ConversationMessage` → `Conversation` 做 join

## Out of Scope
- 修改前端 UI 顯示每則訊息的 token 數（可以是後續 change）
