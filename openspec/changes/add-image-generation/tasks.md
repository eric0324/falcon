# Tasks: add-image-generation

## 1. 基礎建設與設定

- [x] 1.1 安裝依賴：`@aws-sdk/client-s3`、`@aws-sdk/s3-request-presigner`
- [x] 1.2 擴充 `SystemConfig` 的預期 key 清單：`AWS_S3_BUCKET`、`AWS_S3_REGION`、`AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY`
- [x] 1.3 `/admin/settings` 加入四個 S3 欄位（沿用既有 masked input pattern，UI 自動吃 `CONFIG_DEFINITIONS`）
- [x] 1.4 為 S3 設定欄位寫 admin settings 測試（`aws_s3` group auto-detect）

## 2. Storage 模組

- [x] 2.1 建立 `src/lib/storage/s3.ts`：`uploadImage(buffer, key, mime)` 與 `getPresignedUrl(key, ttlSeconds)`
- [x] 2.2 S3 client 採 lazy init，每次呼叫動態讀 `SystemConfig`
- [x] 2.3 為 `s3.ts` 寫 unit test（mock AWS SDK，驗證參數與錯誤處理）

## 3. 圖片生成核心

- [x] 3.1 `src/lib/storage/s3.ts` 新增 `getObjectBuffer(key)`：讀 S3 物件回 Buffer（圖生圖讀原圖用）
- [x] 3.2 建立 `src/lib/ai/image-generation.ts`：定義 `ImageProvider` 型別與 `ImageGenerationResult`
- [x] 3.3 實作 `generateFromText(prompt, provider, userId)`：走 AI SDK `generateImage`，Imagen 4 / GPT-Image-1 → 上傳 S3 → 回傳 `{ s3Key, presignedUrl, provider, modelUsed }`
- [x] 3.4 實作 `generateFromImage(prompt, sourceImageKey, provider, userId)`：讀 S3 原圖 → 走原生 REST：
  - `imagen` → `gemini-2.5-flash-image:generateContent`（base64 inlineData）
  - `gpt-image` → `POST /v1/images/edits`（multipart）
  - 含 ownership 檢查（key 必須以 `images/<userId>/` 開頭）
- [x] 3.5 `src/lib/ai/models.ts` 新增 image pricing：`imagen-4`、`gpt-image-1`、`gemini-2.5-flash-image`；`estimateCost` 對圖片模型以張數計費
- [x] 3.6 為 image-generation 寫 unit test（mock AI SDK 與 fetch，驗證輸入輸出與錯誤）

## 4. Chat Tool 與 API

- [x] 4.1 建立 `src/lib/ai/image-tools.ts`：`generateImage` tool，input schema `{ prompt, provider, sourceImageKey? }`
- [x] 4.2 Tool execute：呼叫 image-generation → 寫 `TokenUsage`（`model=modelUsed`，`outputTokens=1`，`costUsd` 由 `estimateCost`）→ 回傳 `{ type: "image_generated", s3Key, presignedUrl, provider }`
- [x] 4.3 錯誤處理：provider 失敗或內容審核拒絕 → 回傳 `{ type: "image_error", reason }`；TokenUsage 不寫入
- [x] 4.4 `src/app/api/chat/route.ts` 註冊 `generateImage` tool，從 request 讀 `imageProvider` 欄位並驗證
- [x] 4.5 `src/lib/ai/system-prompt.ts` 加入 `IMAGE_GENERATION_INSTRUCTIONS`（英文，always available）
- [x] 4.6 為 image-tools 寫 unit test（6 例）+ system-prompt 加入 generateImage 斷言

## 5. 圖片上傳 endpoint

- [ ] 5.1 建立 `POST /api/chat/upload-image`：multipart/form-data，限制 10MB、MIME 白名單
- [ ] 5.2 上傳成功回傳 `{ s3Key }`
- [ ] 5.3 建立 `GET /api/chat/presign-image?key=...`：驗證 key 屬於該 user → 回傳新 presigned URL
- [ ] 5.4 為 upload 與 presign 寫 API 測試

## 6. UI

- [ ] 6.1 Chat model 選擇器旁新增圖片 provider 選擇器元件（`imagen` / `gpt-image`）
- [ ] 6.2 對話狀態保存 `imageProvider`，傳入 chat API request
- [ ] 6.3 訊息輸入區新增圖檔上傳控制（拖拉 + 點擊選檔）
- [ ] 6.4 訊息渲染支援 `image_generated` tool result：顯示圖片、載入失敗時重簽
- [ ] 6.5 訊息渲染支援 `image_error` tool result：錯誤卡片
- [ ] 6.6 為 UI 元件寫 component test

## 7. 整合與驗證

- [ ] 7.1 手動端到端測試：文生圖（兩 provider）、圖生圖（兩 provider）
- [ ] 7.2 驗證 `TokenUsage` 正確寫入、admin dashboard 顯示
- [ ] 7.3 驗證 presigned URL 過期重簽流程
- [ ] 7.4 驗證 S3 credentials 缺少時的錯誤訊息清楚
- [ ] 7.5 跑 `openspec validate add-image-generation --strict`

## 8. 歸檔

- [ ] 8.1 所有任務完成後 `openspec archive add-image-generation --yes`
