# Server-Side History Loading

## Problem

當對話訊息累積後，客戶端每次呼叫 `POST /api/chat` 都把**完整對話歷史**（含 tool call results）放進 request body。
當 payload 超過 Nginx 預設的 `client_max_body_size`（1MB），回傳 413 Request Entity Too Large。

雖然 server 端已有 `compactMessages` 機制，但訊息在 Nginx 層就被擋住，根本到不了 server。

## Solution

改為 **server 端從 DB 載入對話歷史**，客戶端只傳送：

- `conversationId`（已存在的對話）
- `message`（本次新的使用者訊息，單一字串）
- `model`、`dataSources`、`skillPrompt`、`files`（metadata）

### 流程變更

**Before（現行）：**
```
Client: POST /api/chat { messages: [全部歷史], model, files, ... }
Server: 直接使用 req.body.messages
```

**After（改後）：**
```
Client: POST /api/chat { conversationId?, message, model, files, ... }
Server:
  1. 如果有 conversationId → 從 DB 載入歷史 (getMessages)
  2. 加上本次 user message
  3. 進行 compact / trim
  4. 呼叫 AI
  5. 回應結束後，將新訊息寫入 DB
```

### 額外措施

- 建議 Nginx 配置 `client_max_body_size 5m`，容納帶有檔案附件的請求

## Scope

- `src/app/api/chat/route.ts` — 從 DB 載入歷史，回應後寫入新訊息
- `src/app/(app)/chat/page.tsx` — 只傳送新訊息而非完整歷史
- Nginx 配置建議（文件記錄）

## Out of Scope

- 訊息的 auto-save 流程維持不變（作為 fallback）
- 對話的 CRUD API（`/api/conversations`）不改動
- DB schema 不改動
