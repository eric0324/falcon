# Design: Conversation-Centric Architecture

## Conceptual Model Shift

```
Before (Tool-centric):
  Tool（主體）
   ├── code
   ├── metadata
   └── conversation（附屬 JSON，deploy 時才建立）

After (Conversation-centric):
  Conversation（主體）
   ├── messages[]
   ├── title, model, dataSources
   ├── createdAt / updatedAt
   └── tool?（產物，0 或 1 個）
```

一個 Conversation 可能：
- 純對話（0 個 Tool）— 問問題、查資料、計算
- 產出 1 個 Tool — 典型的「建立工具」流程

關係是 1:0..1 — 一個對話最多產出一個工具。

## Schema Changes

```prisma
model Conversation {
  id          String   @id @default(cuid())
  title       String?                        // NEW: auto-generated from first message
  messages    Json[]
  model       String?                        // NEW: preferred AI model
  dataSources String[] @default([])          // NEW: selected data sources

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId String

  tool Tool?                                 // CHANGED: 1:0..1 (was tools Tool[])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId, updatedAt])               // NEW: for listing user's recent conversations
}

model Tool {
  // ... existing fields ...
  conversationId String? @unique             // CHANGED: add @unique for 1:1 relationship
}
```

Changes:
- **Added `title`**: nullable, auto-generated from the first user message (前 50 字)
- **Added `model`**: stores user's model preference for the session
- **Added `dataSources`**: stores selected data source names
- **Added index**: `[userId, updatedAt]` for efficient listing
- **Changed `tools Tool[]` → `tool Tool?`**: 一個對話最多一個工具
- **Added `@unique` on `Tool.conversationId`**: Prisma 1:1 relation 要求

## Auto-Save Flow

```
User sends message
  → POST /api/chat (existing, unchanged)
  → Frontend receives stream response
  → After stream completes:
      → PATCH /api/conversations/{id}  (append messages)
      → If no conversation yet:
          → POST /api/conversations (create with first message pair)
          → Update URL to /studio?id={conversationId}
```

Key decisions:
1. **Save after each exchange, not during streaming** — avoids partial saves
2. **Frontend drives saves** — keeps /api/chat stateless and streaming-focused
3. **Create on first exchange** — not on page load (avoids empty conversations)

## API Design

```
GET    /api/conversations              → list (userId, ordered by updatedAt desc)
POST   /api/conversations              → create (title, messages, model, dataSources)
GET    /api/conversations/:id          → get with messages
PATCH  /api/conversations/:id          → update (append messages, update title/model)
DELETE /api/conversations/:id          → soft delete or hard delete
```

Response shape for list:
```json
[
  {
    "id": "clx...",
    "title": "幫我查一下最近的訂單",
    "model": "claude-sonnet-4-20250514",
    "updatedAt": "2026-01-27T06:30:00Z",
    "hasTool": true
  }
]
```

## Homepage Integration

```
┌─────────────────────────────────────────────┐
│  Recent Conversations                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│  │ 查詢訂單 │ │ HR 報表  │ │ 問個問題 │      │
│  │ 2hr ago  │ │ 昨天     │ │ 3天前    │      │
│  │ 🔧 1 tool│ │ 🔧 1 tool│ │          │      │
│  └─────────┘ └─────────┘ └─────────┘      │
│                                             │
│  My Tools                                   │
│  [existing tool grid...]                    │
└─────────────────────────────────────────────┘
```

Homepage shows both:
- **Recent Conversations** — 最近 N 個對話，點擊進入 Studio 繼續
- **My Tools** — 已發布的工具（保持現有邏輯）

## Tool Deploy Flow (Updated)

```
Before:
  Deploy → Create Conversation → Create Tool (with conversationId)

After:
  Chat starts → Conversation auto-created
  ...
  Deploy → Create Tool (with existing conversationId)
```

`POST /api/tools` 不再需要自己建立 Conversation，只接收 `conversationId`。

## Trade-offs

| Decision | Alternative | Rationale |
|----------|-------------|-----------|
| Frontend drives saves | Backend auto-saves via /api/chat | Keeps chat API stateless; simpler streaming; matches existing architecture |
| Title from first message | User-editable title | Simpler MVP; can add edit later |
| No soft delete | Soft delete with `deletedAt` | YAGNI; hard delete for MVP |
| Save after stream completes | Save on each message | Avoids partial/interrupted saves; simpler error handling |
