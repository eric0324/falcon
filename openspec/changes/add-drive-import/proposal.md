# Proposal: add-drive-import

## Summary

新增「從 Google Drive 匯入」到知識庫，支援 Google Docs（整份 → chunked）與 Google Sheets（每列 = 一個知識點），UX 對齊既有的 Notion 匯入流程。

## Motivation

知識庫目前只能上傳 PDF/CSV/XLSX 或從 Notion 匯入。許多公司資料其實放在 Google Drive（Docs 為主，Sheets 用於 FAQ/客服腳本）。要使用者下載再上傳很笨。

## Scope

- 支援 Google Docs（export → markdown → chunker）
- 支援 Google Sheets（export → CSV → 每列為一知識點）
- 搜尋 Drive 中使用者有權限的 Docs / Sheets
- 顯示 icon、parent folder、「在 Drive 開啟」連結、cursor 分頁
- 未授權時導向 Google connect 流程

不在範圍：
- PDF / DOCX / PPTX 等其他檔案類型（之後 Phase 2）
- 整資料夾批次匯入
- Schema / migration（沿用既有 KnowledgeUpload）

## Approach

### Drive connector 新增
- `exportDocAsMarkdown(fileId, accessToken)` — Drive `/files/{id}/export?mimeType=text/markdown`
- `exportSheetAsCsv(fileId, accessToken)` — Drive `/files/{id}/export?mimeType=text/csv`
- `searchDriveFiles({ query, cursor, accessToken })` — Drive `/files` with `mimeType in (doc, sheet)` + 排序

### 新 API route `/api/knowledge-bases/:id/import-drive`
- **GET** `?query=&cursor=` → 回 `{ files: [{id, name, mimeType, icon, parentLabel, modifiedTime, url}], nextCursor, hasMore }`
- **POST** `{ fileId, fileName, mimeType }` →
  - Docs：export markdown → 整份 chunkSegments → 多筆 KnowledgePoint
  - Sheets：export CSV → parse 每列 → 每列一筆 KnowledgePoint，metadata.row = 列號
  - KnowledgeUpload.fileName = `Drive Doc: {name}` / `Drive Sheet: {name}`，fileType = `gdoc`/`gsheet`

### 未授權處理
- GET 端先檢查 user 是否有 Google Drive 的 OAuth token
- 沒有 → 回 401 + `{ error: "needs_auth", authUrl: "/api/auth/google?service=drive&redirect=..." }`
- UI 看到 `needs_auth` → 顯示「請先連結 Google Drive」+ 按鈕導向 `authUrl`

### UI
- 觸發按鈕：`<Button>從 Google Drive 匯入</Button>`，與現有 Notion 按鈕並列
- Dialog：fork 自 Notion dialog，icon 顯示 📄(doc) / 📊(sheet)
- 已授權但無 Drive token → 顯示連結提示

## Impact

| 區域 | 檔案 | 改動 |
|------|------|------|
| Drive connector | `src/lib/connectors/google/drive.ts` | 加 export + search helper |
| API | `src/app/api/knowledge-bases/[id]/import-drive/route.ts` | 新增（GET + POST） |
| UI | `src/app/(app)/knowledge/[id]/knowledge-detail-client.tsx` | 加觸發按鈕與 dialog |
| i18n | `src/i18n/messages/{zh-TW,en}/knowledge.json` | 加翻譯字串 |
| Test | `src/lib/connectors/google/drive.test.ts` | 新增（搜尋 + export 行為） |
