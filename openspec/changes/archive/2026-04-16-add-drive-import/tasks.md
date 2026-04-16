# Tasks: add-drive-import

## Drive connector

- [x] 1. 寫測試：`searchDriveFiles` 帶 query / cursor 時的 request 結構（mimeType filter、orderBy、pageSize、pageToken）
- [x] 2. 寫測試：`exportDocAsMarkdown(fileId)` 呼叫 export endpoint 並回傳字串
- [x] 3. 寫測試：`exportSheetAsCsv(fileId)` 呼叫 export endpoint 並回傳 CSV 字串
- [x] 4. 實作三個 helper 在 `src/lib/connectors/google/drive.ts`

## API

- [x] 5. 新增 `src/app/api/knowledge-bases/[id]/import-drive/route.ts`
  - GET：搜尋 Drive 檔案 + 處理未授權
  - POST：依 mimeType 走 Doc / Sheet 匯入流程
- [x] 6. CSV → 列文字化的小 helper（`{欄位}: {值}` 串接，跳過空值）

## UI

- [x] 7. `knowledge-detail-client.tsx`：加觸發按鈕與 dialog（fork Notion dialog 結構）
- [x] 8. 實作未授權狀態的 UI（顯示連結提示 + 按鈕）
- [x] 9. 實作載入更多

## i18n + 收尾

- [x] 10. 補翻譯字串到 `messages/{zh-TW,en}/knowledge.json`
  - `driveImport`, `driveImportButton`, `driveSearchPlaceholder`, `driveSearchHint`,
    `driveOpenInDrive`, `driveLoadMore`, `driveNeedsAuth`, `driveConnect`
- [x] 11. lint + typecheck
- [ ] 12. 手動測試（dev：搜尋 / 匯入 Doc / 匯入 Sheet / 未授權 flow）
- [x] 13. `openspec archive add-drive-import --yes`
