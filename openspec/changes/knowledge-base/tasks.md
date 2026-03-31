# Tasks: Knowledge Base

## Phase 3-1: 基礎建設

### Task 1: pgvector + pg_jieba 設定
- [ ] Docker Compose 改用 `pgvector/pgvector:pg15` image（開發環境）
- [ ] Docker image 額外安裝 pg_jieba（或用已整合的 image）
- [ ] 建立 raw SQL migration：`CREATE EXTENSION IF NOT EXISTS vector; CREATE EXTENSION IF NOT EXISTS pg_jieba;`
- [ ] 驗證 `vector(1024)` 欄位可建立和查詢
- [ ] 驗證 `to_tsvector('jiebacfg', ...)` 中文分詞正常
- [ ] 文件化生產環境安裝步驟（pgvector + pg_jieba）

### Task 2: BullMQ + Redis 整合
- [ ] Docker Compose 加入 Redis service
- [ ] 安裝 `bullmq` + `ioredis` packages
- [ ] 建立 `src/lib/queue/connection.ts`（Redis connection 共用）
- [ ] 建立 `src/lib/queue/queues.ts`（定義 queues：`knowledge:parse-upload`, `knowledge:vectorize`）
- [ ] 建立 `src/worker.ts`（worker process entry point，註冊所有 job processors）
- [ ] `package.json` 加 `worker` script：`tsx src/worker.ts`
- [ ] 驗證 job enqueue → worker 消費流程

### Task 3: Voyage AI 整合
- [ ] 安裝 Voyage AI SDK 或實作 HTTP client
- [ ] 建立 `src/lib/knowledge/embedding.ts`
- [ ] `embedText(text: string): Promise<number[]>` — 單文字 embedding
- [ ] `embedTexts(texts: string[]): Promise<number[][]>` — 批次 embedding
- [ ] 錯誤處理 + 重試邏輯

---

## Phase 3-2: 知識庫 CRUD + 權限 + 評價

### Task 4: Prisma Model
- [ ] 新增 `KnowledgeBase` model
- [ ] 新增 `KnowledgeBaseMember` model + `KnowledgeBaseRole` enum
- [ ] 新增 `KnowledgeBaseReview` model
- [ ] 新增 `KnowledgeUpload` model + `UploadStatus` enum
- [ ] 新增 `KnowledgePoint` model + `PointStatus` enum
- [ ] User model 加 relations
- [ ] db push / migration

### Task 5: 知識庫 API
- [ ] `GET /api/knowledge-bases` — 列出使用者可見的知識庫
- [ ] `POST /api/knowledge-bases` — 建立知識庫（任何登入使用者）
- [ ] `GET /api/knowledge-bases/:id` — 知識庫詳情
- [ ] `PUT /api/knowledge-bases/:id` — 更新知識庫
- [ ] `DELETE /api/knowledge-bases/:id` — 刪除知識庫
- [ ] 權限檢查 middleware

### Task 6: 成員管理 API
- [ ] `GET /api/knowledge-bases/:id/members` — 列出成員
- [ ] `POST /api/knowledge-bases/:id/members` — 新增成員
- [ ] `PUT /api/knowledge-bases/:id/members/:memberId` — 更新角色
- [ ] `DELETE /api/knowledge-bases/:id/members/:memberId` — 移除成員
- [ ] 建立者自動成為 ADMIN

### Task 7: 評價 API
- [ ] `GET /api/knowledge-bases/:id/reviews` — 列出評價
- [ ] `POST /api/knowledge-bases/:id/reviews` — 新增/更新評價（upsert, 1-5 星 + 選填文字）
- [ ] `DELETE /api/knowledge-bases/:id/reviews` — 刪除自己的評價
- [ ] 權限檢查：需有 VIEWER 以上權限
- [ ] 建立者不可自評

### Task 8: 知識庫列表 UI
- [ ] `/knowledge` 頁面：列出使用者可見的知識庫（含平均評分）
- [ ] 建立知識庫 dialog
- [ ] 評價元件（星星 + 評論）
- [ ] Sidebar 加入知識庫入口

---

## Phase 3-3: 檔案上傳 + 解析 Pipeline

### Task 9: 檔案解析器
- [ ] 安裝 `pdf-parse`、`xlsx`、`csv-parse`
- [ ] 建立 `src/lib/knowledge/parsers/pdf-parser.ts`
- [ ] 建立 `src/lib/knowledge/parsers/excel-parser.ts`
- [ ] 建立 `src/lib/knowledge/parsers/csv-parser.ts`
- [ ] 統一介面：`parse(buffer: Buffer, fileName: string): ParseResult[]`

### Task 10: 文件切割器
- [ ] 建立 `src/lib/knowledge/chunker.ts`
- [ ] PDF：按段落切割，chunk size ~500 tokens，overlap ~100 tokens
- [ ] Excel：每列合併欄位為文字，作為一個 chunk
- [ ] CSV：同 Excel 策略
- [ ] 每個 chunk 帶 metadata（source, page/sheet/row）

### Task 11: 上傳 API + BullMQ Job
- [ ] `POST /api/knowledge-bases/:id/uploads` — 接收檔案（multipart/form-data）
- [ ] `GET /api/knowledge-bases/:id/uploads` — 列出上傳紀錄
- [ ] 上傳後 enqueue `knowledge:parse-upload` job（payload: uploadId + file buffer base64）
- [ ] Worker processor：解析 → 切割 → 建立 PENDING 知識點
- [ ] 失敗重試 3 次 + 更新 status=FAILED

---

## Phase 3-4: 知識點管理 + 審核 + 向量化

### Task 12: 知識點 API
- [ ] `GET /api/knowledge-bases/:id/points` — 列出知識點（分頁 + status 篩選）
- [ ] `POST /api/knowledge-bases/:id/points` — 手動新增知識點
- [ ] `PUT /api/knowledge-bases/:id/points/:pointId` — 編輯知識點
- [ ] `DELETE /api/knowledge-bases/:id/points/:pointId` — 刪除知識點

### Task 13: 審核流程
- [ ] `POST /api/knowledge-bases/:id/points/review` — 批次審核（approve/reject）
- [ ] Approve 時 enqueue `knowledge:vectorize` job（payload: pointIds）
- [ ] 編輯已 APPROVED 知識點 → 重設為 PENDING + 清除 embedding

### Task 14: 向量化 Worker
- [ ] `knowledge:vectorize` processor：讀取知識點 → 呼叫 Voyage AI → raw SQL 寫入 embedding
- [ ] 批次處理：每次最多 50 筆，超過則分批 enqueue
- [ ] 建立 pgvector index（`hnsw`，cosine ops）

### Task 15: 知識庫詳情 UI
- [ ] `/knowledge/:id` 頁面
- [ ] 知識點列表（分頁 + status tab 切換）
- [ ] 上傳檔案區域（drag & drop）
- [ ] 審核操作（單筆 + 批次 checkbox）
- [ ] 手動新增/編輯知識點 dialog

---

## Phase 3-5: Chat RAG 整合

### Task 16: Hybrid Search
- [ ] 建立 `src/lib/knowledge/search.ts`
- [ ] 向量搜尋：raw SQL `ORDER BY embedding <=> $1 LIMIT $2`
- [ ] 全文搜尋：`to_tsvector('jiebacfg', ...)` + `ts_rank`
- [ ] RRF 合併：`score = Σ 1/(60+rank)`
- [ ] 回傳 top-k 結果 + score + metadata

### Task 17: Chat 整合
- [ ] 知識庫註冊為 dataSource type（`kb_<id>`）
- [ ] Chat API：偵測 `kb_` dataSource → 執行 hybrid search
- [ ] System prompt 注入檢索結果 + citation 指示（英文）
- [ ] Chat UI：dataSource 選擇器顯示使用者可見的知識庫
- [ ] 回應顯示引用標記 + 來源列表

---

## Phase 3-6: 外部 API + API Key

### Task 18: UserApiKey Model + 管理
- [ ] 新增 `UserApiKey` Prisma model
- [ ] `GET /api/me/api-keys` — 列出我的 keys
- [ ] `POST /api/me/api-keys` — 產生 key（回傳明文一次，只存 hash）
- [ ] `DELETE /api/me/api-keys/:id` — 撤銷 key
- [ ] API Key 管理 UI（`/profile/api-keys`）

### Task 19: 外部查詢 API
- [ ] `POST /api/v1/knowledge/query` — 查詢知識庫
- [ ] `GET /api/v1/knowledge/bases` — 列出有權限的知識庫
- [ ] API Key 認證 middleware（Bearer token → hash → lookup）
- [ ] 權限檢查：API Key 對應的 User 需有知識庫 VIEWER 權限
- [ ] Rate limiting：60 req/min per key

### Task 20: 知識庫設定 UI
- [ ] `/knowledge/:id/settings` 頁面
- [ ] 成員管理：新增/移除/更新角色
- [ ] 知識庫基本資訊編輯
- [ ] 系統提示詞編輯（textarea，可選填）
- [ ] 刪除知識庫（需確認）

---

## 測試

### Task 21: 測試
- [ ] 知識點 chunker 單元測試
- [ ] Hybrid search 單元測試（mock embedding）
- [ ] 權限檢查測試
- [ ] API Key 認證測試
- [ ] TypeScript 型別檢查
- [ ] 既有測試無 regression
