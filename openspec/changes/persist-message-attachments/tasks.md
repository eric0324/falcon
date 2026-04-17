# Tasks: persist-message-attachments

## 1. Schema 與型別

- [x] 1.1 Prisma schema 的 `ConversationMessage` 加 `attachments Json?`
- [x] 1.2 產生 migration：`prisma/migrations/20260417114000_add_message_attachments/`（手動建立避開既有 drift）
- [x] 1.3 `src/types/message.ts` 新增 `MessageAttachment` 型別（`name` / `type` / `size` / `s3Key?` / `presignedUrl?` / `base64?`）並在 `Message` 加 `attachments?: MessageAttachment[]`

## 2. Conversation messages 讀寫

- [x] 2.1 `appendMessages` / `createConversationWithMessages` / `replaceMessages` 寫入 attachments（透過 `toAttachmentsJson` 剝除 client-only 欄位）
- [x] 2.2 `getMessages` 解析 `attachments` JSON，為有 `s3Key` 者批次 `getPresignedUrl` 並注入 `presignedUrl`；presign 失敗容錯
- [x] 2.3 為 `conversation-messages.test.ts` 補 attachments 寫入、讀取 + presign、失敗容錯、null 三組測試，既有測試同步加 `attachments: undefined`

## 3. Chat API 接收

- [x] 3.1 `chat/route.ts` 從 body 多讀 `attachments`，用 defensive parse 保留 name/type/size/s3Key
- [x] 3.2 寫 user message 時把 attachments 傳入 `appendMessages`（只在有 attachments 時附加）
- [x] 3.3 LLM messages 組裝不帶 attachments（沿用既有 `files` 與 `attachedImageKeys`）

## 4. Chat page 上送

- [x] 4.1 送 request 時從 `uploadedFiles` 組 attachments 陣列放進 body：`{ name, type, size, s3Key? }`
- [x] 4.2 本地 state 的 user message 也帶 attachments，並在 type 為 image/* 時保留 base64 供即時預覽

## 5. UI 渲染

- [x] 5.1 `chat-message.tsx`：user message 氣泡內新增 `MessageAttachments` 區塊（上分隔線區分）
- [x] 5.2 `AttachmentImage`：`<img>` 縮圖（max-h-32），`onError` 時 fetch `/api/chat/presign-image?key=<key>` 重簽；兩次都失敗則 fallback 顯示檔名 + icon
- [x] 5.3 非圖片 attachment：檔名 + icon（`file-upload.tsx` 的 `getFileIcon` 改為 export 複用）
- [x] 5.4 優先順序：`base64` (data URL) > `presignedUrl`；chat page 本地 Message type 擴充 `attachments?: MessageAttachment[]`

## 6. 整合驗證

- [ ] 6.1 端到端：上傳 2 張圖 + 1 個 PDF → 送出 → 訊息氣泡下顯示 2 縮圖 + PDF 檔名
- [ ] 6.2 重整頁面：訊息氣泡下附件仍顯示（圖片走 presignedUrl、PDF 顯示檔名）
- [ ] 6.3 presigned URL 過期：1 小時後重整，圖片 onError 觸發重簽並正常顯示
- [ ] 6.4 跑 `openspec validate persist-message-attachments --strict`

## 7. 歸檔

- [ ] 7.1 所有任務完成後 `openspec archive persist-message-attachments --yes`
