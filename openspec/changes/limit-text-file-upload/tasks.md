# Tasks: 文本附件上傳智能截斷與警告

## Task 1: 上限常數與估算
- [ ] 建立 `src/lib/attachments/limits.ts`
  - `WARN_TOKENS = 8_000`（≈ 30KB 純文字）
  - `HARD_TOKENS = 32_000`（≈ 128KB）
- [ ] 在 `src/lib/ai/token-utils.ts` 新增 `estimateTextBytes(text): number`（重用 estimateTokens）
- [ ] 撰寫單元測試

## Task 2: 截斷策略
- [ ] 建立 `src/lib/attachments/text-truncate.ts`
- [ ] 實作 `truncateHead(text, maxTokens): { text, truncated: boolean, originalLines, keptLines }`
- [ ] 實作 `truncateCsvSmart(text, maxTokens)`：保留 header + 前 N rows
- [ ] 截斷後 text 尾端附 `\n[... 已截斷，原始 X 行 / Y 字元，保留前 Z 行]`
- [ ] 撰寫單元測試（純文字、CSV、超短檔不動作）

## Task 3: 後端攔截
- [ ] 修改 `src/app/api/chat/route.ts` 的 `buildMessageContent()`
- [ ] 文本類 MIME 先算 token
- [ ] 超過 HARD_TOKENS → 回傳 400 與 `{ error: "attachment_too_large", fileName, tokens, limit }`
- [ ] 介於 WARN / HARD 之間 → 依 client 送上來的 `truncateMode`（`head | csv | full`）處理
- [ ] 預設 `head`（client 無指定時）

## Task 4: 前端預估與警告
- [ ] 在上傳元件（chat page 的 attachment 處理）加入 token 估算
- [ ] 超過 WARN_TOKENS → 顯示 modal / inline 警告：
  - 「此檔案約 X tokens，將佔用約 Y% 的對話空間」
  - 選項：「截斷」/「仍要全量送」/「取消」
- [ ] 超過 HARD_TOKENS → 直接拒絕上傳，提示使用者拆檔
- [ ] 使用者選擇後，`truncateMode` 帶入 API request

## Task 5: Prompt 提示
- [ ] 截斷過的附件，在 prompt text content 裡明確標註
- [ ] 例如：`[檔案: data.csv，已截斷：原 5000 行，保留前 120 行 + header]\n{content}`
- [ ] 讓 AI 知道資料不完整，回答時會提示

## Task 6: 錯誤處理與 UX
- [ ] 後端 400 錯誤前端要優雅顯示
- [ ] 前端警告不能阻塞整個 chat 流程

## Task 7: 測試
- [ ] 單元測試覆蓋 limits、truncate
- [ ] 整合測試：上傳 5KB / 50KB / 200KB 三種尺寸

## 依賴關係

```
Task 1 ← Task 2 ← Task 3, Task 5
              ← Task 4
```

- Task 1、2 先做
- Task 3、4 可平行
- Task 5 在 Task 3 之後（要改 prompt 組裝）
