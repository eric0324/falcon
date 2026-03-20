# Design: Server-Side History Loading

## Architecture

```
Client                          Nginx              Server (API Route)           DB
  │                               │                      │                      │
  │ POST /api/chat                │                      │                      │
  │ { conversationId, message,    │                      │                      │
  │   model, files, ... }         │                      │                      │
  │ (~small payload)              │                      │                      │
  │──────────────────────────────>│─────────────────────>│                      │
  │                               │                      │── getMessages(id) ──>│
  │                               │                      │<── messages[] ───────│
  │                               │                      │                      │
  │                               │                      │ compact + trim       │
  │                               │                      │ streamText(...)      │
  │<─────────────────── streaming response ──────────────│                      │
  │                               │                      │                      │
  │                               │                      │── appendMessages() ─>│
  │                               │                      │   (user + assistant) │
```

## Key Decisions

### 1. 新訊息寫入時機

在 AI streaming 結束後，server 端將本次的 user message + assistant response 寫入 DB。
使用 `appendMessages()` 新函式（不刪除舊訊息），而非現有的 `replaceMessages()`。

**理由**：`replaceMessages` 每次都 delete + createMany 全部訊息，改用 append 更高效。

### 2. 新對話（無 conversationId）

維持現行邏輯：server 在 route 中建立 conversation，然後在 streaming 結束後寫入訊息。
客戶端傳送 `message`（單一字串），不再傳 `messages` 陣列。

### 3. 客戶端 auto-save 簡化

目前客戶端在 AI 回應結束後會呼叫 `POST /api/conversations` 或 `PATCH /api/conversations/[id]` 來儲存訊息。
改後由 chat API route 直接寫入 DB，客戶端的 auto-save 可移除。

### 4. Nginx 設定

新增 `client_max_body_size 5m` 配置建議，主要是為了容納帶有 base64 檔案附件的請求。

## New Function: `appendMessages`

```typescript
// conversation-messages.ts
export async function appendMessages(
  conversationId: string,
  messages: Message[]
): Promise<string[]>
```

- 查詢目前最大 `orderIndex`
- 從 `maxIndex + 1` 開始新增訊息
- 回傳新增的 assistant message IDs（用於 token usage linking）

## Impact Analysis

| Component | Change |
|-----------|--------|
| `chat/route.ts` | 從 DB 載入歷史；streaming 後 append 新訊息 |
| `chat/page.tsx` | 只傳 `message` + `conversationId`；移除 auto-save |
| `conversation-messages.ts` | 新增 `appendMessages()` |
| Nginx | 文件記錄 `client_max_body_size` 建議 |
