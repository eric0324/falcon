# Knowledge Base — Change Specification

此為 knowledge-base change 的詳細技術 spec，補充 `openspec/specs/knowledge-base/spec.md` 主 spec 的實作細節。

## 1. pgvector 設定

### 開發環境（Docker）

```yaml
# docker-compose.yml
services:
  postgres:
    image: pgvector/pgvector:pg15
    # 其餘設定不變
```

### 生產環境（自建 PostgreSQL）

```sql
-- 需要 superuser 權限
CREATE EXTENSION IF NOT EXISTS vector;
```

### Prisma 處理

pgvector 的 `vector` 型別 Prisma 不原生支援：

1. KnowledgePoint model 中不宣告 embedding 欄位
2. 用 raw SQL migration 加欄位：
```sql
ALTER TABLE "KnowledgePoint" ADD COLUMN "embedding" vector(1024);
CREATE INDEX ON "KnowledgePoint" USING hnsw ("embedding" vector_cosine_ops) WHERE status = 'APPROVED';
```
3. 查詢/寫入用 `prisma.$queryRawUnsafe()`

---

## 2. 檔案解析 + 切割詳細規格

### PDF 切割

```
策略：
1. pdf-parse 取得全文
2. 依段落分割（雙換行）
3. 合併短段落直到接近 500 tokens
4. 相鄰 chunk overlap 100 tokens
5. 每個 chunk 帶 metadata: { source: fileName, page: pageNumber }
```

### Excel 切割

```
策略：
1. xlsx 讀取所有 sheets
2. 每個 sheet：第一列為 header
3. 每一資料列：將各欄位合併為 "欄位名: 值" 格式的文字
4. 每列為一個 chunk
5. metadata: { source: fileName, sheet: sheetName, row: rowIndex }
```

### CSV 切割

```
策略：
1. csv-parse 讀取
2. 同 Excel：第一列為 header，每列合併為文字
3. metadata: { source: fileName, row: rowIndex }
```

---

## 3. BullMQ Worker 規格

### 架構

```
Next.js API Route                    Worker Process (src/worker.ts)
      │                                       │
      │  enqueue job                          │  consume job
      ├──────────► Redis ◄────────────────────┤
      │            (BullMQ)                   │
      │                                       ├─► parse-upload processor
      │                                       └─► vectorize processor
```

### Redis 設定（Docker Compose）

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
```

### Queue 定義

```typescript
// src/lib/queue/queues.ts
import { Queue } from "bullmq";
import { connection } from "./connection";

export const parseUploadQueue = new Queue("knowledge:parse-upload", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  },
});

export const vectorizeQueue = new Queue("knowledge:vectorize", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  },
});
```

### knowledge:parse-upload processor

```typescript
// job.data: { uploadId: string, fileBase64: string, fileName: string, fileType: string }
// 1. Buffer.from(fileBase64, "base64")
// 2. 根據 fileType 選擇 parser
// 3. 解析 + 切割
// 4. 批次建立 KnowledgePoint (status=PENDING)
// 5. 更新 KnowledgeUpload: status=PENDING_REVIEW, pointCount=N
// 6. 失敗時更新 KnowledgeUpload: status=FAILED, error=message
```

### knowledge:vectorize processor

```typescript
// job.data: { pointIds: string[] }
// 1. 讀取知識點 content（最多 50 筆）
// 2. 呼叫 Voyage AI embedTexts()
// 3. Raw SQL 批次更新 embedding 欄位
// 4. 超過 50 筆時，剩餘的 enqueue 新 job
```

### Worker Entry Point

```typescript
// src/worker.ts
import { Worker } from "bullmq";
import { connection } from "./lib/queue/connection";
import { parseUploadProcessor } from "./lib/knowledge/processors/parse-upload";
import { vectorizeProcessor } from "./lib/knowledge/processors/vectorize";

new Worker("knowledge:parse-upload", parseUploadProcessor, { connection, concurrency: 2 });
new Worker("knowledge:vectorize", vectorizeProcessor, { connection, concurrency: 3 });

console.log("Workers started");
```

### 生產環境部署
- Redis：`apt install redis-server`，啟用 AOF 持久化
- Worker process 用 systemd 管理
- `package.json` script: `"worker": "tsx src/worker.ts"`

```ini
# /etc/systemd/system/falcon-worker.service
[Unit]
Description=Falcon Knowledge Worker
After=network.target redis-server.service

[Service]
Type=simple
User=falcon
WorkingDirectory=/path/to/falcon
ExecStart=/usr/local/bin/bun run worker
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

---

## 4. Hybrid Search 實作

```sql
-- 向量搜尋（cosine similarity）
WITH vector_results AS (
  SELECT id, content, metadata,
         1 - (embedding <=> $1::vector) AS similarity,
         ROW_NUMBER() OVER (ORDER BY embedding <=> $1::vector) AS rank
  FROM "KnowledgePoint"
  WHERE "knowledgeBaseId" = $2 AND status = 'APPROVED'
  ORDER BY embedding <=> $1::vector
  LIMIT 20
),
-- 全文搜尋
text_results AS (
  SELECT id, content, metadata,
         ts_rank(to_tsvector('jiebacfg', content), plainto_tsquery('jiebacfg', $3)) AS text_score,
         ROW_NUMBER() OVER (ORDER BY ts_rank(to_tsvector('jiebacfg', content), plainto_tsquery('jiebacfg', $3)) DESC) AS rank
  FROM "KnowledgePoint"
  WHERE "knowledgeBaseId" = $2 AND status = 'APPROVED'
    AND to_tsvector('jiebacfg', content) @@ plainto_tsquery('jiebacfg', $3)
  LIMIT 20
)
-- RRF 合併
SELECT COALESCE(v.id, t.id) AS id,
       COALESCE(v.content, t.content) AS content,
       COALESCE(v.metadata, t.metadata) AS metadata,
       COALESCE(1.0/(60+v.rank), 0) + COALESCE(1.0/(60+t.rank), 0) AS rrf_score
FROM vector_results v
FULL OUTER JOIN text_results t ON v.id = t.id
ORDER BY rrf_score DESC
LIMIT $4;
```

全文搜尋使用 `pg_jieba` 中文分詞，需在 PostgreSQL 安裝 pg_jieba extension：

```sql
CREATE EXTENSION IF NOT EXISTS pg_jieba;
```

安裝後可使用 `'jiebacfg'` 作為 text search configuration。

---

## 5. Chat System Prompt 注入（英文）

```
## Knowledge Base Context

The user has selected a knowledge base as a data source. Below are the most relevant knowledge points retrieved from the knowledge base.

**Instructions:**
- Answer the user's question based ONLY on the provided knowledge points
- If the knowledge points do not contain relevant information, say so honestly — do NOT make up answers
- Cite your sources using [1], [2], etc. notation
- At the end of your answer, list the citations with their source metadata

**Retrieved Knowledge Points:**
[1] {content} (Source: {fileName}, Page: {page})
[2] {content} (Source: {fileName}, Sheet: {sheet}, Row: {row})
...
```

---

## 6. 外部 API Response 格式

### POST /api/v1/knowledge/query

**Request:**
```json
{
  "knowledgeBaseId": "clxxx...",
  "query": "如何申請退款？",
  "topK": 5
}
```

**Response:**
```json
{
  "answer": "根據知識庫資料，退款流程如下...",
  "citations": [
    {
      "content": "退款申請需在購買後 7 天內提出...",
      "source": "FAQ.pdf",
      "page": 3,
      "score": 0.87
    }
  ],
  "usage": {
    "embeddingTokens": 15,
    "llmInputTokens": 1200,
    "llmOutputTokens": 350
  }
}
```
