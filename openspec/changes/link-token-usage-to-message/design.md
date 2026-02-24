# Design: link-token-usage-to-message

## Schema Change

### Before
```
Conversation (model)
  └─ ConversationMessage (model)  ← model 永遠是 null
  └─ TokenUsage (conversationId, model, inputTokens, outputTokens)
```

### After
```
Conversation (model = 使用者偏好)
  └─ ConversationMessage            ← 移除 model 欄位
       └─ TokenUsage (model, inputTokens, outputTokens)
```

## Data Model

### ConversationMessage（修改）
```diff
model ConversationMessage {
  id             String   @id @default(cuid())
  conversationId String
  orderIndex     Int
  role           String
  content        String   @db.Text
- model          String?
  toolCalls      Json?
  conversation   Conversation @relation(...)
+ tokenUsages    TokenUsage[]
  createdAt      DateTime @default(now())
  ...
}
```

### TokenUsage（修改）
```diff
model TokenUsage {
  id              String   @id @default(cuid())
  userId          String
- conversationId  String?
+ conversationMessageId String?
  model           String
  inputTokens     Int
  outputTokens    Int
  totalTokens     Int
  createdAt       DateTime @default(now())
  user            User          @relation(...)
- conversation    Conversation? @relation(...)
+ conversationMessage ConversationMessage? @relation(...)
- @@index([conversationId])
+ @@index([conversationMessageId])
}
```

### Conversation（修改）
```diff
model Conversation {
  ...
- tokenUsages          TokenUsage[]
  ...
}
```

## 寫入流程

### Chat API（改動最小）
目前：TokenUsage.create({ conversationId, ... })
改為：TokenUsage.create({ userId, model, inputTokens, outputTokens })（orphan record，無任何關聯）

### Conversations API（orphan linking）

**POST /api/conversations**（建立）：
1. 建立 conversation + messages
2. 取得 assistant messages 的 IDs
3. 找近 2 分鐘內該 user 無 `conversationMessageId` 的 `TokenUsage`
4. 依時間順序配對到 assistant messages

**PATCH /api/conversations/:id**（更新）：
1. replaceMessages 後取得新建的 assistant message IDs
2. 找近 2 分鐘內該 user 無 `conversationMessageId` 的 `TokenUsage`
3. 關聯到最新的 assistant message

## 讀取流程

### getMessages（修改）
```ts
const rows = await prisma.conversationMessage.findMany({
  where: { conversationId },
  orderBy: { orderIndex: "asc" },
  include: {
    tokenUsages: {
      select: { model: true, inputTokens: true, outputTokens: true }
    }
  }
});
```

### Message type（修改）
```ts
interface Message {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  tokenUsage?: { model: string; inputTokens: number; outputTokens: number };
}
```

## Admin 查詢

由 `TokenUsage.conversationId` 改為 join through `ConversationMessage.conversationId`：

```ts
prisma.tokenUsage.groupBy({
  by: ["conversationMessageId"],
  where: {
    conversationMessage: { conversationId: { in: conversationIds } }
  },
  _sum: { inputTokens: true, outputTokens: true, totalTokens: true },
});
```
