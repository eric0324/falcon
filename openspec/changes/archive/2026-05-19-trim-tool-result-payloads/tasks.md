# Tasks: 修剪 Sheets / Gmail tool result 多餘 payload

## Task 1: Helper 純函式
- [x] 1.1 建立 `src/lib/ai/trim-tool-payload.ts`
- [x] 1.2 export `trimSheetsReadPayload(data: unknown): unknown` — 若 data 是 `{ headers, rows, raw }` 形式，回傳剝離 raw 的物件；否則原樣回傳
- [x] 1.3 export `trimGmailBody(data: unknown, options?: { maxChars: number }): unknown` — 若 data 含 `body` 字串且 > maxChars（預設 5000），裁切並加 `\n\n[Body truncated: kept first N chars of M total]` 標記；否則原樣回傳
- [x] 1.4 兩個函式都是 pure（用 spread + delete 不 mutate 輸入）

## Task 2: 單元測試
- [x] 2.1 建立 `src/lib/ai/trim-tool-payload.test.ts`（14 個測試全綠）
- [x] 2.2 `trimSheetsReadPayload`：含 raw → 移除；不含 raw → 原樣；非物件 → 原樣
- [x] 2.3 `trimSheetsReadPayload`：headers + rows 仍完整保留（reference equality 不變）
- [x] 2.4 `trimSheetsReadPayload`：不 mutate 輸入
- [x] 2.5 `trimGmailBody`：body > 5000 → 裁切 + marker
- [x] 2.6 `trimGmailBody`：body ≤ 5000 → 不動
- [x] 2.7 `trimGmailBody`：data 無 body 欄位（list 結果）→ 原樣
- [x] 2.8 `trimGmailBody`：body 不是字串 → 原樣
- [x] 2.9 `trimGmailBody`：custom maxChars 生效
- [x] 2.10 `trimGmailBody`：marker 格式正確（含 N total）

## Task 3: 接入 google-tools.ts
- [x] 3.1 import 兩個 helper
- [x] 3.2 sheets service 的 read/list 拿到 result 後，過 `trimSheetsReadPayload`
- [x] 3.3 gmail service 的 read 拿到 result 後，過 `trimGmailBody`
- [x] 3.4 其他 service（drive / calendar）不動

## Task 4: System prompt 更新
- [x] 4.1 `src/lib/ai/system-prompt.ts:863` 改為不含 raw 描述
- [x] 4.2 移除 `raw: [[...]]` 部分
- [x] 4.3 保留「Sheets 用 `.rows` 取物件陣列，`.headers` 取欄位名」這句

## Task 5: 驗收
- [x] 5.1 既有測試套件全綠（932 tests pass）
- [x] 5.2 `bunx tsc --noEmit` 無新增錯誤
- [x] 5.3 `bun run build` 通過（修了一個 eslint no-unused-vars 警告：`_raw` 改為 spread + delete）
- [x] 5.4 本地實測：對話中讓 AI 呼叫 sheets read，server log / response 確認 `data` 沒 `raw` 欄位
- [x] 5.5 本地實測：對話中讓 AI 讀一封長信，確認 body 被裁切並含 marker
- [x] 5.6 部署一個用到 sheets 的工具，確認 runtime `data.raw` 仍能取得（bridge 不變）

## Task 6: 收尾
- [x] 6.1 Changelog v0.34.1（內部優化 showDialog: false）
- [x] 6.2 `openspec validate trim-tool-result-payloads --strict` 通過
- [x] 6.3 archive

## 依賴關係

```
Task 1 ── Task 2 ──┐
                   ├── Task 3 ── Task 5 ── Task 6
              Task 4 ─┘
```
