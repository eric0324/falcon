# Proposal: add-image-generation

## Summary

在對話中以 AI tool 方式接上圖片生成能力，支援 Google Imagen 4 與 OpenAI GPT-Image-1，提供文生圖與圖生圖。圖片儲存於 S3 private bucket，透過 presigned URL 讀取；計費沿用現有 `TokenUsage` schema，`outputTokens` 存張數、`costUsd` 存實際費用。使用者可在對話中透過獨立的圖片 provider 選擇器指定要用的模型。

## Motivation

目前平台只能做文字對話與 UI 程式碼生成，使用者無法透過自然語言產生圖片素材。常見需求如 banner、封面、產品示意圖、插畫等，都只能外求工具。補上圖片生成後，使用者可以在單一介面完成從發想到素材的完整流程，也為後續圖片編輯、素材庫等能力打底。

## Scope

**包含**：
- Chat tool `generateImage`：支援文生圖與圖生圖
- 兩家 provider：Google Imagen 4、OpenAI GPT-Image-1
- 圖片上傳：使用者本地圖檔作為圖生圖的原圖輸入
- S3 private bucket 儲存，presigned URL 讀取
- 計費：寫入 `TokenUsage`，`outputTokens` 存張數
- UI：chat model 選擇器旁新增圖片 provider 選擇器、訊息渲染圖片、輸入區支援上傳圖檔
- `SystemConfig` 擴充 AWS S3 credentials 設定

**不包含**（留給後續）：
- 尺寸 / 張數 / 品質等參數由使用者控制（第一版固定 1 張、1024x1024、standard quality）
- 圖片編輯（inpainting、outpainting、遮罩）
- 引用對話中先前生成的圖做圖生圖（只支援本地上傳）
- 圖片 quota（第一版沿用既有 token quota 機制，必要時另開）
- Bridge API 讓部署工具呼叫圖片生成

## Approach

### 1. Storage 層 `src/lib/storage/s3.ts`
- 封裝 AWS SDK v3 S3 client，credentials 從 `SystemConfig` 動態讀取
- 提供 `uploadImage(buffer, key)` 與 `getPresignedUrl(key, ttl)`
- Key 格式：`images/<userId>/<uuid>.<ext>`

### 2. Image Generation 核心 `src/lib/ai/image-generation.ts`
- `generateFromText(prompt, provider)` → 呼叫 Imagen / GPT-Image-1，取得圖片 buffer
- `generateFromImage(prompt, sourceImageKey, provider)` → 圖生圖
- 生成後上傳 S3，回傳 `{ s3Key, presignedUrl }`

### 3. Chat Tool `generateImage`
- 在 `src/lib/ai/tools.ts`（或新檔 `image-tools.ts`）新增 tool
- Input schema：`{ prompt, sourceImageKey?: string, provider: "imagen" | "gpt-image" }`
- Execute：呼叫 image-generation → 寫 `TokenUsage`（outputTokens = 張數） → 回傳 `{ type: "image_generated", s3Key, presignedUrl, provider }`

### 4. 上傳 endpoint
- 新增 `POST /api/chat/upload-image`：接收使用者本地圖檔 → 上傳 S3 → 回傳 `s3Key`
- Frontend 在訊息輸入區加入 dropzone / 檔案選擇

### 5. Chat route 與 UI
- `src/app/api/chat/route.ts` 註冊 `generateImage` tool
- 訊息渲染處支援 `image_generated` tool result：顯示圖片、點擊開啟、下載按鈕
- Provider 選擇器：chat model 選擇器旁新增小下拉（`imagen` / `gpt-image`），值存於對話狀態並傳入 tool

### 6. System prompt
- 加入 `generateImage` 使用指引：何時呼叫、如何從使用者語意拆 prompt

## Impact

| 區域 | 檔案 | 改動 |
|------|------|------|
| Storage | `src/lib/storage/s3.ts` | 新增 |
| Image core | `src/lib/ai/image-generation.ts` | 新增 |
| Chat tool | `src/lib/ai/image-tools.ts` | 新增 |
| Chat route | `src/app/api/chat/route.ts` | 註冊 `generateImage`，接 provider 參數 |
| Upload API | `src/app/api/chat/upload-image/route.ts` | 新增 |
| System prompt | `src/lib/ai/system-prompt.ts` | 新增圖片生成使用指引 |
| UI | `src/components/...` | 新增圖片 provider 選擇器、訊息圖片渲染、輸入區上傳 UI |
| Admin Settings | `src/app/(admin)/admin/settings/...` | 新增 AWS S3 設定欄位 |
| Pricing | `src/lib/ai/models.ts` | 圖片 provider 加入 pricing 表 |
| 依賴 | `package.json` | `@aws-sdk/client-s3`、`@aws-sdk/s3-request-presigner` |
