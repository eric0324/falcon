# Image Generation Specification

## Purpose

平台內建圖片生成能力，chat 對話中透過 AI tool 呼叫，支援文生圖與圖生圖，結果永久儲存於 S3。

## ADDED Requirements

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
系統 SHALL 能以使用者上傳的圖檔作為原圖，搭配 prompt 產生新圖。

#### Scenario: 圖生圖成功
- GIVEN `sourceImageKey` 指向 S3 中屬於該 user 的圖片
- AND provider 支援 image-to-image
- WHEN 呼叫 image-generation
- THEN 從 S3 讀取原圖 buffer
- AND 將原圖與 prompt 一併送入 provider
- AND 新圖上傳 S3 並回傳 `{ s3Key, presignedUrl, provider }`

#### Scenario: sourceImageKey 不屬於該 user
- GIVEN `sourceImageKey` 對應的圖檔不屬於發起請求的 user
- WHEN 呼叫 image-generation
- THEN 拒絕執行並回報權限錯誤

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
系統 SHALL 將圖片生成寫入 `TokenUsage`，沿用既有 schema。

#### Scenario: 寫入 TokenUsage
- GIVEN 圖片生成成功
- WHEN tool execute 結束前
- THEN 建立一筆 `TokenUsage` 記錄
- AND `model` 為 `imagen-4` 或 `gpt-image-1`
- AND `inputTokens = 0`
- AND `outputTokens = 1`（第一版固定 1 張）
- AND `costUsd` 依 pricing 表計算

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
