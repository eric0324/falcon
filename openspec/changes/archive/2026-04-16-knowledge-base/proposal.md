# Proposal: Knowledge Base

## Change ID
`knowledge-base`

## Summary
建立知識庫功能：任何使用者可建庫設權限、貢獻者上傳文件自動切割為知識點、人工審核後向量化、Chat RAG 問答附引用、對外 API 供外部服務查詢、使用者可評價知識庫。

## Motivation
公司正在建置客服後台，需要 FAQ 問答能力。目前平台的 Chat 只能接外部資料源做即時查詢，缺乏「先整理知識、再問答」的 RAG 能力。知識庫功能讓團隊把文件（PDF、Excel、CSV）轉為結構化知識點，經審核後供內部 Chat 和外部 API 查詢。

## Prerequisites
- 無硬性前置依賴，可獨立開發
- 生產環境 PostgreSQL 需安裝 pgvector extension

## Scope

### In Scope
- 任何使用者可建立知識庫 + 成員權限管理（ADMIN / CONTRIBUTOR / VIEWER）
- 知識庫評價系統（1-5 星 + 文字評論）
- 檔案上傳：PDF、Excel、CSV，上傳即處理（不存原檔）
- 文件解析 → overlap 切割 → 產生知識點
- 知識點人工審核（單筆 + 批次）、手動新增、編輯
- Voyage AI embedding + pgvector 儲存
- Hybrid search（向量 + 全文）with RRF 排序
- Chat 整合：知識庫作為 dataSource，RAG 問答附引用來源
- 外部 API：User API Key 認證、查詢 endpoint、rate limiting
- Inngest 背景任務：檔案解析、向量化
- 知識庫管理 UI 頁面

### Out of Scope
- 語音上傳（未來再加）
- 原始檔案持久化儲存
- 跨知識庫搜尋（第一版只能選單一知識庫）
- 知識點版本歷史
- 即時協作編輯

## Approach

### 架構

```
上傳檔案 → API Route → BullMQ job → Worker 解析+切割 → 知識點（PENDING）
                                                              ↓
                                                     人工審核 APPROVE
                                                              ↓
                                     BullMQ job → Voyage AI embedding → pgvector
                                                              ↓
Chat 問答 → dataSources 包含 kb_<id>？
              ├─ 否 → 正常 LLM 對話
              └─ 是 → 訊息 embedding → hybrid search (pgvector + pg_jieba) → top-k → LLM + citation
                                                              ↓
外部 API → User API Key 驗證 → 同上搜尋流程 → 回傳 answer + citations
```

### pgvector 設定
- 生產環境（自建 PostgreSQL）：手動安裝 pgvector extension
- 開發環境（Docker）：使用 `pgvector/pgvector:pg15` image
- Prisma 不原生支援 vector type，embedding 欄位用 raw SQL migration + `$queryRawUnsafe` 操作

### Embedding
- Model: Voyage AI `voyage-3`（1024 維）
- 查詢時也用同一模型向量化使用者問題

### 搜尋策略
- 向量搜尋：`1 - (embedding <=> query_embedding)` cosine similarity
- 全文搜尋：PostgreSQL `to_tsvector('chinese', content)` + `ts_rank`
- 合併：RRF（Reciprocal Rank Fusion），`score = Σ 1/(k+rank)`，k=60
- 預設回傳 top 5

### 背景任務（BullMQ + Redis）
- EC2 上跑 Redis（Docker 或直接安裝）
- BullMQ worker 跑在同一台 EC2，作為獨立 process 或 Next.js custom server 內
- `knowledge:parse-upload` queue：解析檔案 → 切割 → 建立 PENDING 知識點
- `knowledge:vectorize` queue：向量化（支援單筆與批次）
- 失敗重試 3 次，exponential backoff
- 零第三方費用

### 外部 API 認證
- User 產生 API Key，系統只存 SHA-256 hash
- API Key 綁定 User，權限依 User 的知識庫 membership
- Rate limiting: 60 req/min per API Key

## Implementation Phases

### Phase 3-1: 基礎建設（pgvector + BullMQ/Redis + Voyage AI）
建立向量搜尋基礎設施和背景任務系統。

### Phase 3-2: 知識庫 CRUD + 權限 + 評價
知識庫的建立、成員管理、權限控制、評價系統。

### Phase 3-3: 檔案上傳 + 解析 Pipeline
檔案上傳、解析、切割為知識點。

### Phase 3-4: 知識點管理 + 審核 + 向量化
知識點的 CRUD、審核流程、向量化。

### Phase 3-5: Chat RAG 整合
知識庫作為 dataSource、hybrid search、citation。

### Phase 3-6: 外部 API + API Key
User API Key 管理、對外查詢 endpoint。

## Risks
- **PostgreSQL extensions 安裝**：生產環境需手動安裝 pgvector + pg_jieba，需要 superuser 權限。pg_jieba 需從 source 編譯
- **Voyage AI 成本**：大量文件向量化會產生 API 費用，但審核機制可控制量
- **切割品質**：自動切割不一定精準，靠人工審核把關
- **Redis 維運**：EC2 上需維護 Redis instance，建議用 Docker 跑並設定持久化
- **pg_jieba 編譯**：pg_jieba 需從 source 編譯安裝，依賴 cmake + PostgreSQL dev headers
