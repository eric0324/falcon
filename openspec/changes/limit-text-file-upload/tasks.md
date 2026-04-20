# Tasks: 文本附件上傳智能截斷與警告

## Task 1: 上限常數與估算
- [x] 建立 `src/lib/attachments/limits.ts`
  - `WARN_TOKENS = 8_000`、`HARD_TOKENS = 32_000`
  - `classifyAttachmentSize(tokens): "ok" | "warn" | "reject"`
- [x] 直接重用既有 `estimateTokens()`，不另外加 helper
- [x] 撰寫單元測試（6 tests pass）

## Task 2: 截斷策略
- [x] 建立 `src/lib/attachments/text-truncate.ts`
- [x] 實作 `truncateHead(text, maxTokens): TruncateResult`
- [x] 實作 `truncateCsvSmart(text, maxTokens)`：保留 header + 後續 rows
- [x] 截斷後 text 尾端附 `[... 已截斷：原始 X 行 / Y 字元，保留前 Z 行]`
- [x] 撰寫單元測試（11 tests pass，含 CSV、空字串、超短檔、極小 budget edge cases）

## Task 3: 後端攔截
- [x] 修改 `src/app/api/chat/route.ts` 的 `buildMessageContent()`
- [x] 文本類 MIME 先 base64 → utf-8 → 算 token
- [x] 超過 HARD_TOKENS → throw `AttachmentTooLargeError`，POST catch 回 400 與 `{ error: "attachment_too_large", fileName, tokens, limit }`
- [x] WARN 區間：依 `f.truncateMode`（`head | csv | full`）處理；CSV 預設 csv，其餘預設 head
- [x] OK：原樣傳

## Task 4: 前端預估與警告
- [x] `file-upload.tsx` 的 `handleFileChange` 加入 token 估算（`file.text()` + `estimateTokens`）
- [x] HARD：toast 拒絕並 skip（不加入 list）
- [x] WARN：toast 通知 + 預設 truncateMode（CSV → csv，其餘 → head）；FileList 顯示 token 數與「截斷／完整」標籤
- [x] FileList 標籤可點擊切換 truncate ↔ full，由 chat page 透過 `onChange` 更新狀態
- [x] `filesToSend` 帶上 `truncateMode`

## Task 5: Prompt 提示
- [x] 截斷後標註已在 truncate 結果尾端帶出（Task 2 已做）
- [x] 完整送出時 prompt 標明「使用者選擇完整送出，約 X tokens」

## Task 6: 錯誤處理與 UX
- [x] chat page 接 res.status === 400 + `attachment_too_large`，顯示 toast 並回滾本輪 user message
- [x] WARN toast 不阻塞，使用者可繼續送出

## Task 7: 測試
- [x] 單元測試覆蓋 limits、truncate（共 17 tests pass）
- [ ] 整合測試（5KB / 50KB / 200KB 三種尺寸）— 待 staging 手動實測

## 依賴關係

```
Task 1 ← Task 2 ← Task 3, Task 5
              ← Task 4
```

- Task 1、2 先做
- Task 3、4 可平行
- Task 5 在 Task 3 之後（要改 prompt 組裝）
