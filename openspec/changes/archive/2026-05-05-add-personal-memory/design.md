# Design: 個人記憶功能

本 change 跨越資料層（Prisma + pgvector）、後端（chat API + 新 memory API）、前端（管理頁 + 對話側欄），且引入新的資料擷取 pattern（雙路徑擷取 + confidence-based 確認流程），需要 design 文件先把架構決策攤出來。

## 整體資料流

```
[使用者訊息]
      │
      ├─→ [主動擷取] 關鍵字 hit  ──→ [Memory: confidence=high, source=explicit]  ──→ 立刻存 DB
      │
      ├─→ [召回] embedding → top-5 → 塞入 system prompt
      │
      ▼
[Claude 對話回應]
      │
      └─→ [被動擷取] Haiku pass (async)  ──→ [SuggestedMemory]  ──→ 側欄顯示  ──→ 使用者確認  ──→ [Memory: confidence=medium, source=suggested]
```

## 資料模型

### Memory table

```prisma
enum MemoryType {
  preference
  context
  rule
  fact
}

enum MemorySource {
  explicit   // 關鍵字觸發
  suggested  // 被動擷取並被使用者確認
}

enum MemoryConfidence {
  high    // 來自 explicit
  medium  // 來自 suggested
}

model Memory {
  id          String            @id @default(cuid())
  userId      String
  type        MemoryType
  title       String            @db.VarChar(120)   // 短摘要，顯示用
  content     String            @db.Text           // 完整內容，塞進 prompt
  source      MemorySource
  confidence  MemoryConfidence
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  embedding   Unsupported("vector(1024)")?

  user        User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, type])
  @@index([userId, createdAt])
}
```

### SuggestedMemory table（候選記憶）

候選與正式記憶分表有幾個好處：
- 候選清單天然有 TTL（例：7 天未確認自動清除），避免污染主表
- 使用者不確認的候選，保留以避免重複提議
- 避免 join 正式記憶表時載入一堆未確認項

```prisma
enum SuggestedMemoryStatus {
  pending      // 待使用者確認
  accepted     // 已確認，已轉入 Memory（保留紀錄方便去重）
  dismissed    // 使用者拒絕
}

model SuggestedMemory {
  id              String                @id @default(cuid())
  userId          String
  conversationId  String?
  type            MemoryType
  title           String                @db.VarChar(120)
  content         String                @db.Text
  status          SuggestedMemoryStatus @default(pending)
  acceptedMemoryId String?              // 確認後指向 Memory.id
  createdAt       DateTime              @default(now())

  user            User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  conversation    Conversation?         @relation(fields: [conversationId], references: [id], onDelete: SetNull)

  @@index([userId, status])
  @@index([conversationId])
}
```

## 關鍵決策

### 1. Embedding 來源：複用 Voyage AI

目前 `src/lib/knowledge/embedding.ts` 使用 Voyage `voyage-3` 產生 1024-dim embedding，pgvector column 也是 `vector(1024)`。直接複用，不引入新 provider。

- `src/lib/memory/embed.ts` 是薄包裝，call `embedTexts([text])`
- 寫入 Memory 時同步 embed；更新 content 時重新 embed

### 2. 主動擷取：關鍵詞偵測用規則，不用 LLM

關鍵字列表（中 / 英混合）：

```ts
const EXPLICIT_TRIGGERS = [
  // 中文
  "記起來", "記住", "記下", "以後都", "每次都", "我喜歡", "我討厭",
  "我在做", "我的部門是", "我的職位是", "我叫",
  // 英文
  "remember", "please remember", "always", "never", "I prefer",
  "I'm working on", "I am working on", "my department is", "my role is"
];
```

命中後用 LLM（Haiku）萃取 `title` + `type` + 正規化的 `content`，因為原始訊息往往是「記起來，我在 HR 部門」這種口語，需要結構化。這一步是 LLM 呼叫，但成本低（Haiku + 短 prompt）。

**為何不全靠 LLM 判斷**：規則偵測是第一道守門，避免每則訊息都呼 LLM 做「這是不是記憶」判斷，省成本且延遲低。命中規則才升級到 LLM 結構化。

### 3. 被動擷取：async 觸發，不阻塞回應

chat API 回應結束後（stream 結束事件），送到背景 queue 跑 Haiku pass：

```
POST /api/chat
  └─ 回應 stream 完成
     └─ enqueue: extractPassiveMemoriesJob({ userId, conversationId, lastNMessages: 6 })
        └─ Haiku 擷取 → SuggestedMemory(pending)
```

第一版 queue 用現有機制（如果專案有）；否則用 `src/worker.ts` 處理。若都沒有，fire-and-forget 的 Promise（搭配 error log）也可接受 MVP。

**去重**：擷取後比對 Memory 和 SuggestedMemory(status IN (pending, dismissed))，若相似度 > 0.9 跳過。

### 4. 召回：相似度 + 字數預算

```ts
recallMemories(userMessage: string, userId: string): Promise<{ memories: Memory[]; promptText: string }>
```

邏輯：
1. embed(userMessage)
2. SQL `ORDER BY embedding <=> $1 LIMIT 10`（過取，因為要做字數截斷）
3. 過濾相似度分數 >= 0.65 的
4. 按分數由高到低，逐條累加 content，總長度超過 2000 字元就停
5. 組成 prompt 片段注入 system prompt

```
## Personal Memories (recalled for this message)

- [rule] 以後都用 Google Sheets 當資料來源
- [context] 我在 HR 部門
- [preference] UI 要用深色主題
```

### 5. UI：管理頁與側欄分離

- `/memory` 獨立管理頁：按 type 分 tab，每筆顯示 title + content + 編輯 / 刪除
- 對話側欄：只顯示「建議記憶」卡片（SuggestedMemory.status=pending），有「確認」「拒絕」按鈕
- 主動擷取命中時，在對話訊息旁浮出 toast：「已記住：〔title〕」附「到 /memory 管理」連結

## Trade-offs

| 決策 | 選擇 | 為什麼不選 alternative |
|------|------|----------------------|
| Memory / SuggestedMemory 分表 | 分開 | 不分開會讓 Memory 表混入大量未確認項，query 複雜；分表也方便日後對 suggested 做 TTL |
| 關鍵字 + LLM 混合 | 混合 | 純規則無法處理口語變形；純 LLM 每則訊息都 call 成本太高 |
| 召回每則訊息都做 | 是 | 記憶會動態變化（編輯 / 刪除），每則都召回保證新鮮；成本可接受（embedding + pgvector query，不呼 LLM） |
| 字數預算 2000 | 2000 | 5 條 ×  400 字 = 2000 字，夠描述個人背景；再多會稀釋主要對話 context |
| 相似度門檻 0.65 | 0.65 | 保守值，避免完全不相關的記憶被拉進來；實測後可調 |
| Voyage 而非 OpenAI embedding | Voyage | 已在專案使用，不引入新依賴 |

## 待辦（apply 階段解決）

1. Queue 機制：先看專案有沒有現成的 job runner；若無，用 fire-and-forget
2. 關鍵字列表：初版用 design 中列出的，上線後觀察命中率再調
3. 相似度門檻：初版 0.65，依實測資料調整
4. 若使用者關閉記憶功能（未來 feature），召回與擷取都跳過 — 這是 v2
