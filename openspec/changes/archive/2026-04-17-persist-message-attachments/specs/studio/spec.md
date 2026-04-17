# Studio Specification Deltas

## ADDED Requirements

### Requirement: 訊息附件持久化顯示
Studio SHALL 將使用者送出訊息時夾帶的附件資訊（檔名、類型、大小、S3 key）持久化於 `ConversationMessage.attachments`，並在 user message 氣泡下方持續顯示附件預覽，包含在頁面重新整理後仍可見。

#### Scenario: 送出帶附件的訊息
- GIVEN 使用者上傳了一張 PNG 圖片與一個 PDF 檔案
- WHEN 送出訊息
- THEN request body 包含 `attachments: [{ name, type, size, s3Key? }, ...]`，圖片有 `s3Key`、PDF 無
- AND chat API 將 attachments 寫入該 user message

#### Scenario: 圖片附件縮圖渲染
- GIVEN `ConversationMessage.attachments` 有一筆含 `s3Key` 的 png / jpeg / webp
- WHEN `getMessages` 讀取訊息
- THEN 為該 attachment 以 `getPresignedUrl` 簽 URL 並注入 `presignedUrl`
- AND 前端在 user message 氣泡下方以 `<img>` 顯示縮圖

#### Scenario: 非圖片附件顯示檔名與 icon
- GIVEN attachments 中有一筆 PDF（無 `s3Key`）
- WHEN 訊息渲染
- THEN 前端顯示檔名與對應 icon（沿用既有 `getFileIcon` 邏輯）
- AND 不嘗試取得 presigned URL

#### Scenario: 重新整理後附件仍可見
- GIVEN 使用者送出包含圖片附件的訊息並重新整理頁面
- WHEN 訊息從 DB 讀回
- THEN attachments 欄位解析並為圖片簽新 URL
- AND 縮圖在 user message 氣泡下方正常顯示

#### Scenario: Presigned URL 過期自動重簽
- GIVEN 附件縮圖對應的 presigned URL 已過期
- WHEN `<img>` 載入失敗
- THEN 前端呼叫 `/api/chat/presign-image?key=<s3Key>` 取得新 URL
- AND 以新 URL 重試顯示

#### Scenario: 歷史訊息不重送附件給 LLM
- GIVEN 使用者開啟含附件歷史的對話並送出新訊息
- WHEN chat route 組裝送往 LLM 的 messages
- THEN 歷史訊息只包含 text content 與 toolCalls，不重新附加圖片 base64
- AND 新訊息的 `files` 仍透過既有機制塞 base64 parts 給 LLM
