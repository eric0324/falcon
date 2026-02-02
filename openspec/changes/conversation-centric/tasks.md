# Tasks: Conversation-Centric Architecture

## 1. Schema Migration
- [ ] 1.1 新增 Conversation 欄位：`title` (String?), `model` (String?), `dataSources` (String[])
- [ ] 1.2 Conversation 的 `tools Tool[]` 改為 `tool Tool?`（1:0..1）
- [ ] 1.3 Tool 的 `conversationId` 加上 `@unique`
- [ ] 1.4 新增 index: `[userId, updatedAt]`
- [ ] 1.5 執行 `prisma migrate dev`
- [ ] 1.6 驗證現有資料不受影響（新欄位皆 nullable/有 default，@unique 在現有資料無衝突）

## 2. Conversation CRUD API
- [ ] 2.1 `POST /api/conversations` — 建立對話（title, messages, model, dataSources）
- [ ] 2.2 `GET /api/conversations` — 列出使用者對話（id, title, model, updatedAt, hasTool）
- [ ] 2.3 `GET /api/conversations/[id]` — 取得完整對話（含 messages）
- [ ] 2.4 `PATCH /api/conversations/[id]` — 更新對話（append messages, update title/model/dataSources）
- [ ] 2.5 `DELETE /api/conversations/[id]` — 刪除對話
- [ ] 2.6 為每個 endpoint 撰寫測試

## 3. Studio 自動儲存
- [ ] 3.1 第一次訊息交換後，自動呼叫 `POST /api/conversations` 建立對話
- [ ] 3.2 建立後更新 URL 為 `/studio?id={conversationId}`
- [ ] 3.3 後續每次交換完成後，呼叫 `PATCH /api/conversations/[id]` 更新 messages
- [ ] 3.4 同步更新 model 和 dataSources 選擇

## 4. Studio 載入對話
- [ ] 4.1 進入 `/studio?id={conversationId}` 時，呼叫 API 載入完整對話
- [ ] 4.2 還原 messages、code、model、dataSources state
- [ ] 4.3 載入失敗時顯示錯誤並 fallback 到空白對話
- [ ] 4.4 區分 `?id=` (載入對話) 和 `?edit=` (編輯工具) 兩種進入方式

## 5. Tool Deploy 簡化
- [ ] 5.1 `POST /api/tools` 接受 `conversationId` 參數，不再自建 Conversation
- [ ] 5.2 `PATCH /api/tools/[id]` 同理，不再處理 Conversation 建立/更新
- [ ] 5.3 Studio deploy 時直接傳入當前 conversationId
- [ ] 5.4 更新相關測試

## 6. 首頁最近對話
- [ ] 6.1 首頁呼叫 `GET /api/conversations?limit=6` 取得最近對話
- [ ] 6.2 在 My Tools 區塊上方新增 Recent Conversations 區塊
- [ ] 6.3 每張卡片顯示 title、相對時間、是否已產出工具
- [ ] 6.4 點擊導向 `/studio?id={conversationId}`
- [ ] 6.5 空狀態處理（無對話時不顯示該區塊）
