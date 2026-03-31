# Knowledge Base Specification

## Purpose
知識庫功能讓任何使用者建立知識庫、貢獻者上傳文件自動轉為知識點並向量化，一般使用者在 Chat 介面選取知識庫進行 RAG 問答，並提供對外 API 讓外部服務查詢。使用者可以對知識庫評價，幫助其他人找到高品質的知識庫。

## Requirements

### Requirement: 知識庫 CRUD + 權限

任何使用者可建立知識庫，並設定誰可以貢獻（上傳/編輯/刪除知識點）、誰可以查詢。

#### 資料模型

```prisma
model KnowledgeBase {
  id           String  @id @default(cuid())
  name         String
  description  String?
  systemPrompt String? @db.Text // 自訂系統提示詞，引導 LLM 如何使用此知識庫回答
  createdBy    String
  creator      User    @relation(fields: [createdBy], references: [id])

  members     KnowledgeBaseMember[]
  uploads     KnowledgeUpload[]
  points      KnowledgePoint[]
  reviews     KnowledgeBaseReview[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model KnowledgeBaseMember {
  id              String        @id @default(cuid())
  knowledgeBase   KnowledgeBase @relation(fields: [knowledgeBaseId], references: [id], onDelete: Cascade)
  knowledgeBaseId String
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId          String
  role            KnowledgeBaseRole

  createdAt       DateTime @default(now())

  @@unique([knowledgeBaseId, userId])
}

enum KnowledgeBaseRole {
  ADMIN        // 管理知識庫設定 + 成員
  CONTRIBUTOR  // 上傳、編輯、刪除知識點
  VIEWER       // 僅查詢
}
```

#### Scenario: 建立知識庫
- WHEN 任何登入使用者建立知識庫
- THEN 知識庫被建立，建立者自動成為該知識庫的 ADMIN

#### Scenario: 新增成員
- WHEN 知識庫 ADMIN 新增成員
- THEN 該成員以指定角色加入知識庫

#### Scenario: 權限檢查
- WHEN 使用者嘗試操作知識庫
- THEN 系統根據其 KnowledgeBaseMember.role 決定允許或拒絕
- AND 系統 ADMIN 可操作所有知識庫

---

### Requirement: 知識庫評價

使用者可以對有 VIEWER 以上權限的知識庫進行評價，幫助其他人判斷知識庫品質。

#### 資料模型

```prisma
model KnowledgeBaseReview {
  id              String        @id @default(cuid())
  knowledgeBase   KnowledgeBase @relation(fields: [knowledgeBaseId], references: [id], onDelete: Cascade)
  knowledgeBaseId String
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId          String
  rating          Int           // 1-5
  content         String?       @db.Text

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([knowledgeBaseId, userId]) // 每人每知識庫只能評一次
  @@index([knowledgeBaseId])
}
```

KnowledgeBase model 需加入 relation：
```prisma
  reviews     KnowledgeBaseReview[]
```

#### Scenario: 評價知識庫
- WHEN 使用者對知識庫評分（1-5 星）
- AND 使用者有該知識庫的 VIEWER 以上權限
- THEN 建立評價記錄
- AND 可附帶文字評論（選填）

#### Scenario: 每人一次評價
- WHEN 使用者已對該知識庫評過分
- AND 再次提交評價
- THEN 覆蓋原有的評分和評論

#### Scenario: 平均分數顯示
- WHEN 使用者瀏覽知識庫列表或詳情
- THEN 顯示該知識庫的平均評分和評價數量

#### Scenario: 建立者不可自評
- WHEN 知識庫建立者嘗試評價自己的知識庫
- THEN 拒絕操作

---

### Requirement: 檔案上傳與處理

貢獻者可上傳 Excel、CSV、PDF 檔案，系統自動解析並切割為知識點。

#### 資料模型

```prisma
model KnowledgeUpload {
  id              String        @id @default(cuid())
  knowledgeBase   KnowledgeBase @relation(fields: [knowledgeBaseId], references: [id], onDelete: Cascade)
  knowledgeBaseId String
  uploadedBy      String
  uploader        User          @relation(fields: [uploadedBy], references: [id])

  fileName        String
  fileType        String        // "pdf" | "xlsx" | "csv"
  fileSize        Int           // bytes
  status          UploadStatus  @default(PROCESSING)
  error           String?
  pointCount      Int           @default(0) // 產生的知識點數量

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  points          KnowledgePoint[]
}

enum UploadStatus {
  PROCESSING
  PENDING_REVIEW
  COMPLETED
  FAILED
}
```

#### 支援格式

| 格式 | 解析方式 | 切割策略 |
|------|----------|----------|
| PDF  | pdf-parse | 按段落切割，overlap 100 tokens |
| Excel (.xlsx) | xlsx (SheetJS) | 每列或每 sheet 為一個知識點 |
| CSV  | csv-parse | 每列為一個知識點，欄位合併為文字 |

#### Scenario: 上傳檔案
- WHEN 貢獻者上傳檔案
- THEN 建立 KnowledgeUpload 記錄（status=PROCESSING）
- AND 觸發背景任務進行解析

#### Scenario: 解析完成
- WHEN 背景任務完成檔案解析與切割
- THEN 產生 KnowledgePoint 記錄（status=PENDING）
- AND KnowledgeUpload.status 更新為 PENDING_REVIEW
- AND KnowledgeUpload.pointCount 更新

#### Scenario: 解析失敗
- WHEN 背景任務處理失敗
- THEN KnowledgeUpload.status 更新為 FAILED
- AND KnowledgeUpload.error 記錄錯誤原因

---

### Requirement: 知識點管理與審核

知識點是知識庫的最小單位，自動產生後需人工審核才會被向量化並可供查詢。

#### 資料模型

```prisma
model KnowledgePoint {
  id              String        @id @default(cuid())
  knowledgeBase   KnowledgeBase @relation(fields: [knowledgeBaseId], references: [id], onDelete: Cascade)
  knowledgeBaseId String
  upload          KnowledgeUpload? @relation(fields: [uploadId], references: [id], onDelete: SetNull)
  uploadId        String?

  content         String        // 知識點文字內容
  metadata        Json?         // { source: fileName, page?: number, sheet?: string, row?: number }
  status          PointStatus   @default(PENDING)
  reviewedBy      String?
  reviewer        User?         @relation(fields: [reviewedBy], references: [id])

  // pgvector: embedding 存在獨立欄位，用 raw SQL 操作
  // embedding   Unsupported("vector(1024)")

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([knowledgeBaseId, status])
}

enum PointStatus {
  PENDING   // 待審核
  APPROVED  // 已審核，已向量化
  REJECTED  // 已拒絕
}
```

#### Scenario: 審核知識點
- WHEN 貢獻者或知識庫 ADMIN 審核知識點
- AND 標記為 APPROVED
- THEN 系統呼叫 Voyage AI 產生 embedding
- AND 將 embedding 存入 pgvector 欄位

#### Scenario: 拒絕知識點
- WHEN 審核者標記知識點為 REJECTED
- THEN 知識點保留但不向量化，不會出現在查詢結果中

#### Scenario: 編輯知識點
- WHEN 貢獻者編輯已審核的知識點內容
- THEN status 重新變為 PENDING
- AND 清除舊的 embedding

#### Scenario: 手動新增知識點
- WHEN 貢獻者手動新增知識點（不透過檔案上傳）
- THEN 建立 KnowledgePoint（uploadId=null, status=PENDING）

#### Scenario: 批次審核
- WHEN 審核者選取多個知識點批次 APPROVE
- THEN 所有選取的知識點排入向量化佇列

---

### Requirement: 向量化與搜尋

使用 Voyage AI 產生 embedding，存入 pgvector，支援 hybrid search（向量 + 全文）。

#### 技術細節

- **Embedding Model**: Voyage AI `voyage-3`（1024 維）
- **pgvector**: PostgreSQL extension，需在生產環境自建 PostgreSQL 安裝
- **向量欄位**: `KnowledgePoint` 表加 `embedding vector(1024)` 欄位（Prisma 用 raw SQL 操作）
- **全文搜尋**: PostgreSQL tsvector + `pg_jieba` 中文分詞，對 `content` 建立全文索引
- **pg_jieba**: 基於結巴分詞的 PostgreSQL extension，支援精確中文斷詞

#### Scenario: Hybrid Search
- WHEN 使用者發送查詢
- THEN 同時執行向量搜尋（cosine similarity）和全文搜尋（tsvector）
- AND 合併結果，以 RRF（Reciprocal Rank Fusion）加權排序
- AND 回傳 top-k 結果（預設 k=5）

#### Scenario: 僅搜尋已審核知識點
- WHEN 執行搜尋
- THEN 僅搜尋 status=APPROVED 的知識點

---

### Requirement: Chat RAG 整合

使用者在 Chat 介面選取知識庫作為 dataSource，查詢時自動檢索相關知識點並注入 LLM context。每個知識庫可設定自訂系統提示詞，引導 LLM 的回答風格和行為。

#### Scenario: 選取知識庫
- WHEN 使用者在 Chat 介面選取知識庫作為資料來源
- THEN 知識庫 ID 加入 conversation 的 dataSources
- AND 僅顯示使用者有 VIEWER 以上權限的知識庫

#### Scenario: RAG 問答
- WHEN 使用者發送訊息
- AND dataSources 包含 `kb_<id>` 類型的知識庫
- THEN 系統將使用者訊息向量化
- AND 對選取的知識庫執行 hybrid search
- AND 將 top-k 結果作為 context 注入 system prompt
- AND 若知識庫有設定自訂系統提示詞，一併注入 system prompt
- AND LLM 根據檢索到的知識點和系統提示詞回答

#### Scenario: 自訂系統提示詞
- WHEN 知識庫 ADMIN 設定系統提示詞
- THEN 該提示詞在 RAG 問答時注入 LLM context
- AND 提示詞可引導回答語氣、格式、限制等（例如「請用正式語氣回答」「不確定時請說不知道」）
- AND 提示詞為選填，未設定時使用預設 RAG 指示

#### Scenario: 外部 API 也套用系統提示詞
- WHEN 外部服務透過 API 查詢知識庫
- THEN 同樣套用該知識庫的自訂系統提示詞

#### Scenario: 未選取知識庫
- WHEN 使用者發送訊息
- AND dataSources 不包含任何 `kb_<id>`
- THEN 不執行 RAG 流程，正常 LLM 對話

#### Scenario: 引用來源
- WHEN LLM 回答時引用了知識點
- THEN 回答中附帶引用標記（如 [1], [2]）
- AND 回答末尾列出引用來源（檔名、頁碼等 metadata）

#### Scenario: 無相關知識
- WHEN 搜尋結果相似度均低於閾值
- THEN LLM 告知使用者知識庫中無相關資訊
- AND 不編造答案

---

### Requirement: 外部 API

提供 RESTful API 讓外部服務（如客服後台）查詢知識庫。

#### 資料模型

```prisma
model UserApiKey {
  id          String   @id @default(cuid())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId      String
  name        String   // 用途描述，如 "客服後台"
  keyHash     String   @unique // SHA-256 hash of the API key
  keyPrefix   String   // 前 8 碼，用於辨識（如 "fk_a1b2..."）
  lastUsedAt  DateTime?

  createdAt   DateTime @default(now())

  @@index([userId])
}
```

#### API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/v1/knowledge/query | API Key | 查詢知識庫 |
| GET  | /api/v1/knowledge/bases | API Key | 列出有權限的知識庫 |

#### Scenario: API Key 認證
- WHEN 外部服務呼叫 API
- THEN 從 `Authorization: Bearer <api_key>` header 取得 key
- AND 以 SHA-256 hash 比對 UserApiKey.keyHash
- AND 驗證對應 user 有該知識庫的 VIEWER 權限
- AND 更新 lastUsedAt

#### Scenario: 查詢知識庫
- WHEN 外部服務 POST /api/v1/knowledge/query
- WITH `{ knowledgeBaseId, query, topK? }`
- THEN 執行 hybrid search
- AND 回傳 `{ answer, citations: [{ content, source, score }] }`

#### Scenario: Rate Limiting
- WHEN 單一 API Key 超過限制（60 req/min）
- THEN 回傳 429 Too Many Requests

---

### Requirement: 背景任務處理

檔案解析、向量化等耗時操作使用 BullMQ + Redis 背景任務處理，worker 跑在同一台 EC2。

#### 任務佇列

| Queue | 觸發時機 | 說明 |
|-------|----------|------|
| `knowledge:parse-upload` | 檔案上傳後 | 解析檔案 → 切割 → 建立知識點 |
| `knowledge:vectorize` | 知識點審核通過後 | 呼叫 Voyage AI → 存入 embedding（支援單筆與批次） |

#### Scenario: 任務失敗重試
- WHEN 背景任務失敗
- THEN BullMQ 自動重試最多 3 次（exponential backoff）
- AND 3 次都失敗後更新狀態為 FAILED

#### Scenario: 任務進度追蹤
- WHEN 背景任務執行中
- THEN 前端可透過 API polling 查詢 KnowledgeUpload.status
- AND 任務完成或失敗時更新對應 record

## API Endpoints（內部）

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /api/knowledge-bases | 列出使用者可見的知識庫 |
| POST   | /api/knowledge-bases | 建立知識庫 |
| GET    | /api/knowledge-bases/:id | 知識庫詳情 |
| PUT    | /api/knowledge-bases/:id | 更新知識庫 |
| DELETE | /api/knowledge-bases/:id | 刪除知識庫 |
| GET    | /api/knowledge-bases/:id/members | 列出成員 |
| POST   | /api/knowledge-bases/:id/members | 新增成員 |
| PUT    | /api/knowledge-bases/:id/members/:memberId | 更新成員角色 |
| DELETE | /api/knowledge-bases/:id/members/:memberId | 移除成員 |
| POST   | /api/knowledge-bases/:id/uploads | 上傳檔案 |
| GET    | /api/knowledge-bases/:id/uploads | 列出上傳紀錄 |
| GET    | /api/knowledge-bases/:id/points | 列出知識點（分頁 + 篩選 status） |
| POST   | /api/knowledge-bases/:id/points | 手動新增知識點 |
| PUT    | /api/knowledge-bases/:id/points/:pointId | 編輯知識點 |
| DELETE | /api/knowledge-bases/:id/points/:pointId | 刪除知識點 |
| POST   | /api/knowledge-bases/:id/points/review | 批次審核（approve/reject） |
| GET    | /api/knowledge-bases/:id/reviews | 列出評價 |
| POST   | /api/knowledge-bases/:id/reviews | 新增/更新評價 |
| DELETE | /api/knowledge-bases/:id/reviews | 刪除自己的評價 |
| GET    | /api/me/api-keys | 列出我的 API Keys |
| POST   | /api/me/api-keys | 產生 API Key |
| DELETE | /api/me/api-keys/:id | 撤銷 API Key |

## UI 頁面

| 頁面 | 路徑 | 說明 |
|------|------|------|
| 知識庫列表 | /knowledge | 顯示使用者可見的知識庫 |
| 知識庫詳情 | /knowledge/:id | 知識點列表 + 上傳 + 審核 |
| 知識庫設定 | /knowledge/:id/settings | 成員管理 + 知識庫設定 |
| API Key 管理 | /profile/api-keys | 產生/撤銷 API Key |
