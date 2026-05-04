# Knowledge Base Specification

## Purpose
知識庫功能讓任何使用者建立知識庫、貢獻者上傳文件自動轉為知識點並向量化，一般使用者在 Chat 介面選取知識庫進行 RAG 問答，並提供對外 API 讓外部服務查詢。使用者可以對知識庫評價，幫助其他人找到高品質的知識庫。
## Requirements
### Requirement: 知識庫 CRUD + 權限

系統 SHALL 允許任何使用者建立知識庫，並 MUST 提供誰可以貢獻（上傳/編輯/刪除知識點）、誰可以查詢的權限設定。

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

系統 SHALL 允許使用者對有 VIEWER 以上權限的知識庫進行評價，以幫助其他人判斷知識庫品質。

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

系統 SHALL 允許貢獻者上傳 Excel、CSV、PDF 檔案，並 MUST 自動解析並切割為知識點。

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

知識點 SHALL 是知識庫的最小單位，且自動產生後 MUST 經人工審核才會被向量化並可供查詢。

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

系統 SHALL 使用 Voyage AI 產生 embedding 並存入 pgvector，並 MUST 支援 hybrid search（向量 + 全文）。

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

系統 SHALL 允許使用者在 Chat 介面選取知識庫作為 dataSource，查詢時 MUST 自動檢索相關知識點並注入 LLM context。每個知識庫 MAY 設定自訂系統提示詞，引導 LLM 的回答風格與行為。

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

系統 SHALL 提供 RESTful API 讓外部服務查詢知識庫。

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

檔案解析、向量化等耗時操作 SHALL 使用 BullMQ + Redis 背景任務處理，worker MUST 跑在同一台 EC2。

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

### Requirement: Google Drive 檔案搜尋

API SHALL 提供端點供使用者搜尋自己 Drive 中可匯入的檔案（限 Docs / Sheets），並 MUST 支援按最近修改時間排序與 cursor 分頁。

#### Scenario: 搜尋 Drive 檔案
- WHEN 使用者帶 `?query=xxx` 呼叫 GET `/api/knowledge-bases/:id/import-drive`
- AND 使用者已連結 Google Drive
- THEN 系統呼叫 Drive `/files` API
- AND 過濾條件包含 `mimeType in ('application/vnd.google-apps.document', 'application/vnd.google-apps.spreadsheet')`
- AND 排序為 `modifiedTime desc`
- AND 回傳 25 筆，含 `id, name, mimeType, icon, parentLabel, modifiedTime, url, nextCursor, hasMore`

#### Scenario: 載入下一頁
- WHEN 帶 `?cursor=<nextCursor>` 再次呼叫
- THEN 回傳下一頁結果

#### Scenario: 未連結 Google Drive
- WHEN 使用者尚未授權 Google Drive scope
- THEN 回應 401
- AND body 為 `{ error: "needs_auth", authUrl: "<google oauth url>" }`

#### Scenario: parent folder 名稱
- WHEN 結果項目有 parent folder
- THEN `parentLabel` 為該 folder 的名稱
- WHEN 沒有 parent（根目錄）
- THEN `parentLabel` 為空字串

---

### Requirement: Google Docs 匯入

POST 匯入端點 SHALL 將 Google Docs 整份內容 export 為 markdown 後切 chunk 並建立知識點。

#### Scenario: 匯入 Doc
- WHEN POST `/api/knowledge-bases/:id/import-drive` with `{ fileId, fileName, mimeType: "application/vnd.google-apps.document" }`
- THEN 系統呼叫 Drive export `text/markdown` 取得內容
- AND 建立 `KnowledgeUpload`（fileName = `Drive Doc: {name}`, fileType = `gdoc`, status = `PENDING_REVIEW`）
- AND 內容透過 `chunkSegments` 切割
- AND 為每個 chunk 建立 `KnowledgePoint`（metadata.source = `Drive Doc: {name}`, status = `PENDING`）

#### Scenario: 空 Doc
- WHEN export 內容為空
- THEN 回應 400 與訊息「此文件沒有可匯入的內容」

---

### Requirement: Google Sheets 匯入

POST 匯入端點 SHALL 將 Google Sheets export 為 CSV，每一列建立一筆知識點，metadata 記錄列號。

#### Scenario: 匯入 Sheet
- WHEN POST `/api/knowledge-bases/:id/import-drive` with `{ fileId, fileName, mimeType: "application/vnd.google-apps.spreadsheet" }`
- THEN 系統呼叫 Drive export `text/csv` 取得內容
- AND parse CSV 取得 rows（包含 header）
- AND 建立 `KnowledgeUpload`（fileName = `Drive Sheet: {name}`, fileType = `gsheet`）
- AND 為每個 data row 建立 `KnowledgePoint`：
  - `content` = 列內容（欄位名 + 欄位值文字化，例：`姓名: 王小明 | 部門: 工程`）
  - `metadata.source` = `Drive Sheet: {name} - 第 {rowNumber} 列`
  - `metadata.row` = rowNumber（從 1 起算，header 為 0）

#### Scenario: 空 Sheet
- WHEN sheet 沒有 data row（只有 header 或完全空）
- THEN 回應 400 與訊息「此試算表沒有可匯入的內容」

---

### Requirement: Drive 匯入 UI

UI SHALL 在知識庫詳情頁提供「從 Google Drive 匯入」按鈕與對應彈窗，行為對齊 Notion 匯入。

#### Scenario: 觸發按鈕
- WHEN 使用者開啟知識庫詳情頁
- AND 為 CONTRIBUTOR 以上角色
- THEN 顯示「從 Google Drive 匯入」按鈕

#### Scenario: 結果項目
- WHEN dialog 顯示搜尋結果
- THEN 每筆顯示 icon（📄 Doc / 📊 Sheet）、檔名、parent folder、最後修改時間
- AND 提供「在 Drive 開啟」連結（target=_blank to file url）

#### Scenario: 未授權提示
- WHEN GET 回應 `needs_auth`
- THEN dialog 顯示「請先連結 Google Drive」訊息
- AND 提供按鈕導向 `authUrl`

#### Scenario: 載入更多
- WHEN 回應 `hasMore = true`
- THEN dialog 底部顯示「載入更多」按鈕
- WHEN 點擊
- THEN 帶 cursor 重新呼叫並 append 結果

### Requirement: 知識庫頁面 Server-side 權限守門

知識庫的 server page（detail 與 settings）SHALL 在 server 端完成權限檢查，未授權的使用者必須在 server response 階段就被擋下，不可依賴 client 端 redirect 達成擋拒效果。

#### Scenario: 未登入使用者訪問 detail 或 settings 頁
- GIVEN 使用者未登入
- WHEN 訪問 `/knowledge/:id` 或 `/knowledge/:id/settings`
- THEN server 重導至 `/login`（既有行為，保留）

#### Scenario: 已登入但非成員訪問 detail 頁
- GIVEN 使用者已登入
- AND 使用者對該 KB 沒有任何 role（既非 creator、非 member、非系統 admin）
- WHEN 訪問 `/knowledge/:id`
- THEN server 端呼叫 `notFound()`，回應 404
- AND client component 不會被 render
- AND 不洩漏 KB 是否存在

#### Scenario: 成員訪問 detail 頁
- GIVEN 使用者已登入
- AND 使用者對該 KB 有 role（VIEWER / CONTRIBUTOR / ADMIN / creator / system admin 任一）
- WHEN 訪問 `/knowledge/:id`
- THEN client component 正常 render

#### Scenario: 已登入但非成員訪問 settings 頁
- GIVEN 使用者已登入
- AND 使用者對該 KB 沒有任何 role
- WHEN 訪問 `/knowledge/:id/settings`
- THEN server 端呼叫 `notFound()`，回應 404

#### Scenario: 非 ADMIN 成員訪問 settings 頁
- GIVEN 使用者已登入
- AND 使用者對該 KB 是 VIEWER 或 CONTRIBUTOR
- WHEN 訪問 `/knowledge/:id/settings`
- THEN server 端 `redirect` 至 `/knowledge/:id`
- AND settings client component 不會被 render

#### Scenario: ADMIN 成員訪問 settings 頁
- GIVEN 使用者已登入
- AND 使用者對該 KB 的 role 是 ADMIN（含 creator 與 system admin）
- WHEN 訪問 `/knowledge/:id/settings`
- THEN settings client component 正常 render

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
