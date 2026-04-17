# Proposal: persist-message-attachments

## Summary

持久化對話訊息的附件資訊：使用者送出訊息時，附件 metadata（name / type / size / 圖片的 s3Key）寫入 `ConversationMessage`。UI 在 user message 氣泡下方顯示附件預覽 —— 圖片（png / jpeg / webp）以縮圖呈現（透過 presigned URL），其他檔案顯示檔名 + icon。重整頁面後附件預覽仍可見。

## Motivation

目前 `FileUpload` 上傳的檔案送出後從 UI 消失，使用者無法在歷史訊息中看到「自己剛剛附了什麼」。這在圖生圖情境特別明顯：上傳一張照片請 AI 修改，送出後就看不到原圖，要反覆改多輪時搞不清楚自己改了哪張。

## Scope

**包含**：
- `ConversationMessage` 新增 `attachments Json?` 欄位
- Prisma migration
- `Message` type 加 `attachments?: Attachment[]`
- chat route 接收 `attachments` 欄位並寫入 DB
- `getMessages` 讀取時為有 `s3Key` 的附件批次簽 presigned URL
- `ChatMessage` 元件渲染 user message 附件：
  - `image/png` / `image/jpeg` / `image/webp`（有 s3Key）→ 縮圖
  - 其他類型 → 檔名 + icon
- 縮圖 URL 載入失敗時用既有 `/api/chat/presign-image` 重簽

**不包含**（留給後續）：
- 非圖片檔的 S3 上傳（目前仍只 base64 送給 LLM，不存原檔；歷史只看得到檔名，不能重新下載）
- 歷史訊息的附件重新送給 LLM（LLM 送訊息邏輯不變，新訊息 base64 照常、歷史只帶 text）
- 點擊附件放大 / 下載原圖（UI 只做縮圖顯示；既有 ImageResultCard 的模式不套用到附件）
- gif / svg 等其他圖片格式的縮圖（目前 `S3_UPLOADABLE_IMAGE_TYPES` 只接 png / jpeg / webp）

## Approach

### 1. Schema
`ConversationMessage` 加 `attachments Json?` 欄位，儲存以下結構：
```ts
interface MessageAttachment {
  name: string;     // 檔名
  type: string;     // MIME
  size: number;     // bytes
  s3Key?: string;   // 只有上傳到 S3 的圖片才有
}
```

### 2. Message type 擴充
`src/types/message.ts` 的 `Message` interface 加 `attachments?: MessageAttachment[]`。

### 3. Chat API 接收並持久化
- `chat/route.ts` 從 body 多讀 `attachments: MessageAttachment[]`
- 寫 user message 到 DB 時把 `attachments` 放進 `appendMessages` / `createConversationWithMessages`
- 不把 attachments 塞回 LLM messages（LLM 仍透過既有 `files` base64 機制看到當下附件）

### 4. 讀取時批次 presign
- `getMessages` 回傳前，掃描所有訊息的 `attachments`，抽出有 `s3Key` 者批次簽 URL
- 回傳 `Message` 裡每個 attachment 附帶 `presignedUrl?: string`

### 5. UI 渲染
- `ChatMessage` 元件在 user message 氣泡下方（或氣泡內末尾）渲染 attachments
- 圖片：`<img src={presignedUrl}>` + onError 重簽
- 其他：既有 `file-upload.tsx` 的 `getFileIcon` + 檔名顯示

### 6. 前端上送時組 attachments
- `chat/page.tsx` 在送 request 時從 `uploadedFiles` 組 attachments 陣列放進 body
- 本地 state 的 user message 也先帶 attachments（送出當下縮圖用既有 base64 URL 預覽，重整後改用 DB presigned URL）

## Impact

| 區域 | 檔案 | 改動 |
|------|------|------|
| Schema | `prisma/schema.prisma` | `ConversationMessage.attachments Json?` |
| Migration | `prisma/migrations/<timestamp>_add_message_attachments/` | 新增 migration |
| Type | `src/types/message.ts` | 新增 `MessageAttachment`、`Message.attachments?` |
| Persist | `src/lib/conversation-messages.ts` | `appendMessages` / `createConversationWithMessages` / `replaceMessages` 寫 attachments；`getMessages` 批次 presign |
| Chat API | `src/app/api/chat/route.ts` | 接收 body `attachments`，寫 DB |
| Chat page | `src/app/(app)/chat/page.tsx` | 送 request 時組 attachments，本地 message 也帶 attachments |
| UI | `src/components/chat-message.tsx` | 新增附件預覽區塊 |
| Tests | `src/lib/conversation-messages.test.ts` 等 | 新增 attachments 讀寫測試 |
