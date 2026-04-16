# Knowledge Base Spec Delta — add-drive-import

## ADDED Requirements

### Requirement: Google Drive 檔案搜尋

API SHALL 提供端點供使用者搜尋自己 Drive 中可匯入的檔案（限 Docs / Sheets），並 MUST 支援按最近修改時間排序與 cursor 分頁。

#### Scenario: 搜尋 Drive 檔案
- WHEN 使用者帶 `?query=xxx` 呼叫 GET `/api/knowledge-bases/:id/import-drive`
- AND 使用者已連結 Google Drive
- THEN 系統呼叫 Drive `/files` API
- AND 過濾條件包含 `mimeType in ('application/vnd.google-apps.document', 'application/vnd.google-apps.spreadsheet')`
- AND 排序為 `modifiedTime desc`
- AND 回傳 25 筆，含 `id, name, mimeType, icon, parentLabel, modifiedTime, url, nextCursor, hasMore`

#### Scenario: 載入下一頁
- WHEN 帶 `?cursor=<nextCursor>` 再次呼叫
- THEN 回傳下一頁結果

#### Scenario: 未連結 Google Drive
- WHEN 使用者尚未授權 Google Drive scope
- THEN 回應 401
- AND body 為 `{ error: "needs_auth", authUrl: "<google oauth url>" }`

#### Scenario: parent folder 名稱
- WHEN 結果項目有 parent folder
- THEN `parentLabel` 為該 folder 的名稱
- WHEN 沒有 parent（根目錄）
- THEN `parentLabel` 為空字串

---

### Requirement: Google Docs 匯入

POST 匯入端點 SHALL 將 Google Docs 整份內容 export 為 markdown 後切 chunk 並建立知識點。

#### Scenario: 匯入 Doc
- WHEN POST `/api/knowledge-bases/:id/import-drive` with `{ fileId, fileName, mimeType: "application/vnd.google-apps.document" }`
- THEN 系統呼叫 Drive export `text/markdown` 取得內容
- AND 建立 `KnowledgeUpload`（fileName = `Drive Doc: {name}`, fileType = `gdoc`, status = `PENDING_REVIEW`）
- AND 內容透過 `chunkSegments` 切割
- AND 為每個 chunk 建立 `KnowledgePoint`（metadata.source = `Drive Doc: {name}`, status = `PENDING`）

#### Scenario: 空 Doc
- WHEN export 內容為空
- THEN 回應 400 與訊息「此文件沒有可匯入的內容」

---

### Requirement: Google Sheets 匯入

POST 匯入端點 SHALL 將 Google Sheets export 為 CSV，每一列建立一筆知識點，metadata 記錄列號。

#### Scenario: 匯入 Sheet
- WHEN POST `/api/knowledge-bases/:id/import-drive` with `{ fileId, fileName, mimeType: "application/vnd.google-apps.spreadsheet" }`
- THEN 系統呼叫 Drive export `text/csv` 取得內容
- AND parse CSV 取得 rows（包含 header）
- AND 建立 `KnowledgeUpload`（fileName = `Drive Sheet: {name}`, fileType = `gsheet`）
- AND 為每個 data row 建立 `KnowledgePoint`：
  - `content` = 列內容（欄位名 + 欄位值文字化，例：`姓名: 王小明 | 部門: 工程`）
  - `metadata.source` = `Drive Sheet: {name} - 第 {rowNumber} 列`
  - `metadata.row` = rowNumber（從 1 起算，header 為 0）

#### Scenario: 空 Sheet
- WHEN sheet 沒有 data row（只有 header 或完全空）
- THEN 回應 400 與訊息「此試算表沒有可匯入的內容」

---

### Requirement: Drive 匯入 UI

UI SHALL 在知識庫詳情頁提供「從 Google Drive 匯入」按鈕與對應彈窗，行為對齊 Notion 匯入。

#### Scenario: 觸發按鈕
- WHEN 使用者開啟知識庫詳情頁
- AND 為 CONTRIBUTOR 以上角色
- THEN 顯示「從 Google Drive 匯入」按鈕

#### Scenario: 結果項目
- WHEN dialog 顯示搜尋結果
- THEN 每筆顯示 icon（📄 Doc / 📊 Sheet）、檔名、parent folder、最後修改時間
- AND 提供「在 Drive 開啟」連結（target=_blank to file url）

#### Scenario: 未授權提示
- WHEN GET 回應 `needs_auth`
- THEN dialog 顯示「請先連結 Google Drive」訊息
- AND 提供按鈕導向 `authUrl`

#### Scenario: 載入更多
- WHEN 回應 `hasMore = true`
- THEN dialog 底部顯示「載入更多」按鈕
- WHEN 點擊
- THEN 帶 cursor 重新呼叫並 append 結果
