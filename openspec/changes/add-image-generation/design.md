# Design: add-image-generation

## Context

這個 change 跨三個系統：儲存（S3）、AI（新 tool + 兩家圖片 provider）、UI（provider 選擇器 + 訊息渲染 + 上傳）。因為引入專案第一個 S3 使用情境，也涉及既有 `TokenUsage` 語意擴展，先把關鍵決策寫清楚再動工。

## 關鍵決策

### 1. 圖片生成走 AI Tool，不走獨立頁面

所有圖片生成都由 chat 中的 `generateImage` tool 觸發，和 `updateCode` / `updateDocument` 同一類模式。使用者不需要切換介面。

**理由**：UI 一致，既有訊息歷史機制直接可用，不用多維護一條路徑。

**Tradeoff**：不做專屬頁面代表使用者無法看到「所有我生成過的圖」總覽。第一版可接受，之後要做素材庫再另外處理。

### 2. Provider 選擇採獨立下拉，不塞進 chat model 選擇器

Chat model 選擇器是「對話驅動的 LLM」，Imagen / GPT-Image 本身不會對話，塞同一下拉語意混亂。

**作法**：chat model 選擇器旁新增一個小下拉，值域 `"imagen" | "gpt-image"`，預設 `"imagen"`。此值以對話狀態儲存並於呼叫 tool 時作為參數傳入。

**未來擴充**：若新增 provider（例如 Flux），只需加入列舉值。

### 3. 圖片儲存：Private S3 + Presigned URL

**作法**：
- Bucket 設為 private，不開公開讀取
- 每次訊息渲染時由 server 產生 presigned URL（TTL = 1 小時）
- 訊息中永久儲存 `s3Key`，不永久儲存 URL

**理由**：防止圖片外流與熱連結；使用者登出 / 權限變更後無法再存取。

**Tradeoff**：每次渲染訊息要多一次簽章，但與 chat server load 相比可忽略。

### 4. TokenUsage 計費：沿用現有 schema

**作法**：
- `model` 存 `"imagen-4"` 或 `"gpt-image-1"`
- `inputTokens = 0`
- `outputTokens = 張數`（第一版固定為 1）
- `costUsd = 實際費用`

**理由**：不改 schema，最小侵入；admin 既有的用量 dashboard 自動吃到。

**Tradeoff**：`outputTokens` 欄位語意被重載（token 或張數），需在讀取時依 `model` 判斷。第一版 cost 還是準確的，若未來要做更細的用量拆分再另開 `ImageUsage` 表。

### 5. 圖生圖第一版限定「本地上傳」

**作法**：使用者從訊息輸入區上傳圖檔 → POST 到 `/api/chat/upload-image` → 存 S3 → 回傳 `s3Key` → 夾帶於下一則訊息 → tool 以 `sourceImageKey` 讀回 S3 並送給 provider。

**不做**（第一版）：引用對話中先前生成的圖。原因：需設計 message reference 機制，前端要做「挑這張圖」互動，工程量擴張明顯，且使用者可下載再上傳繞道。

### 6. S3 Credentials 透過 SystemConfig 管理

沿用既有 dynamic config pattern（與 `ANTHROPIC_API_KEY` 等相同）：
- `AWS_S3_BUCKET`、`AWS_S3_REGION`、`AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY`
- Admin 在 `/admin/settings` 設定
- 敏感值加密存 DB，env 作 fallback

**理由**：與現有 API key 管理一致，不引入新的 secret 管理路徑。

## 風險與緩解

| 風險 | 緩解 |
|------|------|
| Provider API 失敗（超時 / 內容審核拒絕） | Tool execute 捕獲錯誤，回傳 `{ type: "image_error", reason }`，訊息渲染顯示錯誤卡片 |
| S3 上傳失敗 | 重試 1 次後直接錯誤回饋，不重試過多避免阻塞對話 |
| 上傳圖檔過大或非圖片 | Upload endpoint 限制 10MB、MIME 白名單（`image/png`、`image/jpeg`、`image/webp`） |
| Presigned URL 過期後訊息顯示破圖 | 前端渲染時若圖片載入失敗，call `/api/chat/presign-image?key=...` 重簽 |
| 計費欄位語意重載 | 讀取時依 `model` 是否為圖片 provider 判斷，並於 admin dashboard 明確標示「張數」 |

## 不在本 change 範疇

- 圖片編輯（inpainting、outpainting、遮罩）
- 尺寸 / 張數 / quality 參數暴露給使用者
- 素材庫總覽頁
- 圖片 quota 機制
- Bridge API 圖片生成入口（部署工具呼叫）

這些於後續 change 處理。
