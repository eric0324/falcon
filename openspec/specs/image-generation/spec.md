# image-generation Specification

## Purpose
TBD - created by archiving change add-image-generation. Update Purpose after archive.
## Requirements
### Requirement: 文生圖
系統 SHALL 能根據純文字 prompt 產生圖片，支援 Google Imagen 4 與 OpenAI GPT-Image-1 兩家 provider。

#### Scenario: Imagen 文生圖成功
- GIVEN provider 為 `imagen`
- WHEN 呼叫 image-generation 核心並傳入 prompt
- THEN 回呼 Google Imagen 4 API
- AND 生成結果以 1 張、1024x1024 規格上傳 S3
- AND 回傳 `{ s3Key, presignedUrl, provider: "imagen" }`

#### Scenario: GPT-Image 文生圖成功
- GIVEN provider 為 `gpt-image`
- WHEN 呼叫 image-generation 核心並傳入 prompt
- THEN 回呼 OpenAI GPT-Image-1 API
- AND 生成結果上傳 S3
- AND 回傳 `{ s3Key, presignedUrl, provider: "gpt-image" }`

#### Scenario: Provider 生成失敗
- GIVEN provider 回傳錯誤（網路超時、內容審核拒絕等）
- WHEN image-generation 捕獲錯誤
- THEN 拋出可辨識的錯誤型別，包含 `reason`

### Requirement: 圖生圖

系統 SHALL 提供圖生圖 API，輸入一張或多張 reference image + prompt，產出一張新 image。Reference 上限 4 張。

#### Scenario: 單張 reference（向後相容）
- GIVEN 呼叫 `generateFromImage({ prompt, sourceImageKeys: ["images/u/a.png"], provider, userId })`
- WHEN 處理
- THEN 載入該張 image buffer，呼叫對應 provider edit API
- AND 行為跟過去 `sourceImageKey: "images/u/a.png"` 完全一致

#### Scenario: 多張 reference
- GIVEN `sourceImageKeys` 含 2-4 張 key
- WHEN 處理
- THEN 系統依序載入每張 buffer
- AND 對 Gemini：把多張 inlineData 一起放進 `contents[0].parts`、text part 在最前
- AND 對 OpenAI gpt-image-1：用 FormData append 多次 image 欄位
- AND 回傳一張產出的 image，沿用既有 s3Key 與 modelUsed 規則

#### Scenario: 超過 4 張
- GIVEN `sourceImageKeys.length > 4`
- WHEN 驗證 params
- THEN 拋出錯誤「最多 4 張 reference image」
- AND 不呼叫 provider、不寫 TokenUsage

#### Scenario: sourceImageKeys 空陣列
- GIVEN `sourceImageKeys: []`
- WHEN 驗證 params
- THEN 拋出錯誤「至少需要 1 張 sourceImageKey」

#### Scenario: 任一張 key 不通過 ownership 檢查
- GIVEN 三張 key 中有一張不屬於 caller / 不屬於該 tool 的 asset
- WHEN 驗證
- THEN 整次 reject，回 400
- AND 不載入任何 buffer、不呼叫 provider

### Requirement: Chat Tool
AI SHALL 能透過 `generateImage` tool 呼叫圖片生成。

#### Scenario: AI 觸發文生圖
- GIVEN 使用者要求產生圖片
- WHEN AI 判斷需要生成
- THEN 呼叫 `generateImage({ prompt, provider })`
- AND tool 將 `{ type: "image_generated", s3Key, presignedUrl, provider }` 回傳給 chat，由前端渲染

#### Scenario: AI 觸發圖生圖
- GIVEN 使用者上傳了圖檔並要求修改
- WHEN AI 呼叫 `generateImage({ prompt, sourceImageKey, provider })`
- THEN tool 以圖生圖模式執行並回傳結果

#### Scenario: 生成失敗
- GIVEN image-generation 核心拋出錯誤
- WHEN tool execute 捕獲錯誤
- THEN 回傳 `{ type: "image_error", reason }` 而非拋出給 chat 流程
- AND 前端渲染錯誤卡片

### Requirement: Provider 參數與預設
系統 SHALL 允許呼叫端指定 provider；未指定時使用預設值 `imagen`。

#### Scenario: 對話指定 provider
- GIVEN chat request 帶有 `imageProvider: "gpt-image"`
- WHEN AI 呼叫 `generateImage` 而未明確指定 provider
- THEN tool 使用 `gpt-image`

#### Scenario: 未指定 provider
- GIVEN chat request 未帶 `imageProvider`
- AND AI 呼叫 `generateImage` 未指定 provider
- THEN 使用預設 `imagen`

### Requirement: S3 Private 儲存
系統 SHALL 將生成的圖片儲存於 private S3 bucket，不開啟公開讀取。

#### Scenario: 儲存路徑
- GIVEN 圖片生成完成
- WHEN 上傳 S3
- THEN key 格式為 `images/<userId>/<uuid>.<ext>`
- AND bucket ACL 為 private

#### Scenario: Presigned URL 讀取
- GIVEN 前端要顯示圖片
- WHEN 呼叫 presign endpoint
- THEN 回傳 TTL 為 1 小時的 presigned URL

#### Scenario: Presigned URL 過期重簽
- GIVEN 前端渲染圖片時 URL 已過期
- WHEN 圖片載入失敗
- THEN 前端呼叫 `/api/chat/presign-image?key=<key>` 取得新 URL
- AND 後端驗證 key 屬於該 user 後回傳

### Requirement: 計費記錄

系統 SHALL 將圖片生成寫入 `TokenUsage`，採用 unified usage-tracking schema（`kind="image"`、`units = 圖片張數`），不再把張數塞進 `outputTokens`。

#### Scenario: 寫入 TokenUsage
- GIVEN 圖片生成成功
- WHEN tool execute 結束前
- THEN 建立一筆 `TokenUsage` 記錄
- AND `kind = "image"`
- AND `model` 為 `imagen-4` / `gpt-image-1` / `gemini-2.5-flash-image`
- AND `units = 1`（第一版固定 1 張）
- AND `inputTokens = 0`、`outputTokens = 0`、`totalTokens = 0`
- AND `costUsd` 依 pricing 表計算（`imagePricing[model] * units`）

#### Scenario: 生成失敗不計費
- GIVEN 圖片生成失敗
- WHEN tool execute 捕獲錯誤
- THEN 不寫入 `TokenUsage`

### Requirement: 圖片上傳 API
系統 SHALL 提供 endpoint 讓前端上傳圖檔供圖生圖使用。

#### Scenario: 上傳成功
- GIVEN 使用者選擇 PNG / JPEG / WebP 圖檔，大小不超過 10MB
- WHEN `POST /api/chat/upload-image` with multipart/form-data
- THEN 上傳到 S3 路徑 `images/<userId>/<uuid>.<ext>`
- AND 回傳 `{ s3Key }`

#### Scenario: 檔案過大
- GIVEN 上傳檔案超過 10MB
- WHEN 呼叫 upload endpoint
- THEN 回傳 413 錯誤

#### Scenario: 非白名單 MIME
- GIVEN 上傳 GIF / SVG / PDF 等非白名單類型
- WHEN 呼叫 upload endpoint
- THEN 回傳 415 錯誤

#### Scenario: 未登入
- GIVEN 請求無有效 session
- WHEN 呼叫 upload endpoint
- THEN 回傳 401 錯誤

### Requirement: Vibe Coding Bridge Capability

User-built tools running in the Vibe Coding sandbox SHALL be able to generate or edit images through the api-bridge as a platform capability. The `edit` action SHALL accept either a single `sourceImageKey` (string) or a `sourceImageKeys` (string array) for multi-image edit, with the array capped at 4 entries.

#### Scenario: Tool calls bridge.image.edit with single sourceImageKey

- GIVEN a user-built tool calls `window.companyAPI.execute("image", "edit", { prompt: "make it green", sourceImageKey: "images/<callerUserId>/a.png" })`
- WHEN the bridge dispatches
- THEN the handler normalizes to `sourceImageKeys: ["images/<callerUserId>/a.png"]`
- AND the edit proceeds as before

#### Scenario: Tool calls bridge.image.edit with sourceImageKeys array

- GIVEN a user-built tool calls `window.companyAPI.execute("image", "edit", { prompt: "merge user photo with template", sourceImageKeys: ["images/<callerUserId>/photo.png", "tools/<toolId>/images/template.png"] })`
- WHEN the bridge validates
- THEN every key passes the ownership check (personal-namespace match OR tool-asset match)
- AND `generateFromImage` is called with the array
- AND the response is `{ s3Key, presignedUrl, provider }` for the single output

#### Scenario: sourceImageKeys and sourceImageKey both provided

- GIVEN the tool passes both `sourceImageKey: "k1"` and `sourceImageKeys: ["k2", "k3"]`
- WHEN the bridge normalizes
- THEN `sourceImageKeys` wins
- AND `sourceImageKey` is ignored

#### Scenario: sourceImageKeys empty

- GIVEN the tool passes `sourceImageKeys: []` (and no `sourceImageKey`)
- WHEN the bridge validates
- THEN it returns a 400-style error stating that at least one source image is required

#### Scenario: sourceImageKeys exceeds 4

- GIVEN the tool passes 5 keys in `sourceImageKeys`
- WHEN the bridge validates
- THEN it returns a 400-style error stating the 4-key maximum
- AND no buffers are loaded
- AND no provider call is made

#### Scenario: One key in sourceImageKeys fails ownership

- GIVEN 3 keys: 2 valid for the caller, 1 owned by someone else
- WHEN the bridge validates
- THEN it returns a 400-style error citing the offending key
- AND the call is fully rejected, not partially executed

#### Scenario: Billing still 1 image per edit call

- GIVEN any successful `image.edit` with N source keys (1 ≤ N ≤ 4)
- WHEN the call completes
- THEN exactly one `TokenUsage` row is written with `units = 1` and `kind = "image"`
- AND `costUsd` is determined by `imagePricing[modelUsed] * 1`, regardless of N

### Requirement: Bridge Billing

The bridge image handler SHALL record usage in `TokenUsage` so it counts toward the caller's monthly quota, using the unified usage-tracking schema (`kind="image"`, `units = imageCount`).

#### Scenario: Successful bridge image generation writes TokenUsage

- GIVEN `bridge.image.generate` succeeds producing one image with `modelUsed = "imagen-4"`
- WHEN the handler records usage
- THEN a `TokenUsage` row is created with `kind = "image"`, `userId = caller`, `model = "imagen-4"`, `units = 1`
- AND `inputTokens = 0`, `outputTokens = 0`, `totalTokens = 0`
- AND `costUsd = imagePricing["imagen-4"] * 1`

#### Scenario: Failed bridge image call does not bill

- GIVEN `generateFromText` throws (provider error / quota issue / etc.)
- WHEN the handler catches the error
- THEN no `TokenUsage` row is created
- AND the bridge returns a 500-style error carrying the upstream reason

### Requirement: System Prompt Advertises Bridge Image

The Vibe Coding system prompt SHALL include instructions describing `window.companyAPI.execute("image", ...)` whenever image generation is enabled in the current chat session, so the AI agent proactively designs runtime image features into the tools it builds.

#### Scenario: Image enabled — instructions are injected

- GIVEN the user has selected an image provider for the chat session (so `imageGenerationEnabled === true`)
- WHEN the system prompt is assembled
- THEN it contains an `IMAGE_BRIDGE_INSTRUCTIONS` block describing both `generate` and `edit` actions, alongside the existing agent-side `IMAGE_GENERATION_INSTRUCTIONS`

#### Scenario: Image disabled — instructions are omitted

- GIVEN `imageGenerationEnabled === false`
- WHEN the system prompt is assembled
- THEN the bridge image instructions block is NOT included
- AND the AI agent does not propose runtime image features for that session

### Requirement: Vibe Coding Bridge — Image Upload and Read

User-built tools running in the Vibe Coding sandbox SHALL be able to upload images from end-user input and read back stored images via the api-bridge platform capability `image`, using actions `upload` and `read`. The `read` action SHALL accept keys belonging to either the caller's personal namespace OR the running tool's asset namespace under the same rules as `image.edit`.

#### Scenario: Tool calls image.upload with base64 PNG

- GIVEN a user-built tool calls `window.companyAPI.execute("image", "upload", { base64: "<png base64>", mimeType: "image/png" })`
- WHEN the bridge dispatches
- THEN the server decodes the base64, validates size and MIME, and uploads to S3 at `images/<callerUserId>/<uuid>.png`
- AND responds with `{ s3Key, presignedUrl }` where `presignedUrl` expires in 1 hour
- AND no `TokenUsage` row is created

#### Scenario: image.upload accepts png, jpeg, webp only

- GIVEN the tool calls `image.upload` with `mimeType` not in {`image/png`, `image/jpeg`, `image/webp`}
- WHEN the bridge validates
- THEN it returns a 415-style error citing the unsupported MIME

#### Scenario: image.upload rejects files over 10MB

- GIVEN the decoded base64 buffer exceeds 10 MB
- WHEN the bridge validates
- THEN it returns a 413-style error stating the size and 10MB limit
- AND nothing is written to S3

#### Scenario: image.upload always writes to caller's personal namespace

- GIVEN the request carries a `toolId`
- WHEN `image.upload` is dispatched
- THEN the key is still constructed as `images/<callerUserId>/<uuid>.<ext>` (NOT a tool asset)
- AND the caller can later pass that key as `sourceImageKey` for `image.edit`

#### Scenario: image.read accepts personal key

- GIVEN the tool calls `image.read` with `s3Key: "images/<callerUserId>/abc.png"`
- WHEN the bridge validates
- THEN ownership check passes
- AND it returns `{ s3Key, presignedUrl }` (and base64/mimeType when `includeBytes: true`)

#### Scenario: image.read accepts tool-asset key with valid toolId + access

- GIVEN the request carries `toolId: "T1"`
- AND `s3Key: "tools/T1/images/template.png"`
- AND the caller passes `canUserAccessTool("T1", callerUserId)`
- WHEN the bridge validates
- THEN ownership check passes
- AND the read proceeds

#### Scenario: image.read with includeBytes returns base64 + mimeType

- GIVEN the tool calls `image.read` with `includeBytes: true` (and a valid key under either ownership rule)
- WHEN the bridge dispatches
- THEN it fetches the buffer from S3
- AND responds with `{ s3Key, presignedUrl, base64, mimeType }`

#### Scenario: image.read rejects tool-asset key with mismatching toolId

- GIVEN the request carries `toolId: "T1"` and `s3Key: "tools/T2/images/x.png"`
- WHEN the bridge validates
- THEN it returns a 400-style error citing key/toolId mismatch

#### Scenario: image.read on missing key

- GIVEN the tool calls `image.read` with `includeBytes: true` and a valid-shape `s3Key` whose object does not exist in S3
- WHEN the bridge tries to fetch the buffer
- THEN it returns a 404-style error

#### Scenario: image.read does not charge quota

- GIVEN the caller is within their monthly quota
- WHEN they call `image.read` any number of times
- THEN no `TokenUsage` row is created
- AND `getMonthlyUsage` is unchanged

