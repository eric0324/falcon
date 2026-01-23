# Tasks: Studio 對話增強功能

## 1. 檔案上傳
- [ ] 1.1 新增檔案上傳按鈕（Paperclip icon）
- [ ] 1.2 支援拖放上傳
- [ ] 1.3 支援的檔案類型：
  - 圖片：png, jpg, gif, webp
  - 文件：pdf, txt, md, csv
  - 程式碼：js, ts, json, html, css
- [ ] 1.4 檔案大小限制（例如 10MB）
- [ ] 1.5 顯示已上傳檔案的預覽/縮圖
- [ ] 1.6 可移除已上傳的檔案
- [ ] 1.7 將檔案轉為 base64 傳送給 API

## 2. 資料來源選擇
- [ ] 2.1 建立 DataSourceSelector 元件
- [ ] 2.2 從 API 取得可用資料來源列表
- [ ] 2.3 多選 checkbox 或 tag 形式
- [ ] 2.4 顯示資料來源類型 icon（DB, API, Google 等）
- [ ] 2.5 選擇後顯示在輸入區上方
- [ ] 2.6 將選擇的資料來源 schema 資訊傳給 AI

## 3. 模型選擇
- [ ] 3.1 建立 ModelSelector 元件
- [ ] 3.2 可選模型：
  - Claude Sonnet（預設，平衡）
  - Claude Haiku（快速，簡單任務）
  - Claude Opus（最強，複雜任務）
- [ ] 3.3 顯示模型說明/建議用途
- [ ] 3.4 儲存使用者偏好（localStorage）

## 4. 更新 Chat API
- [ ] 4.1 接受 files 參數（base64 陣列）
- [ ] 4.2 接受 dataSources 參數（ID 陣列）
- [ ] 4.3 接受 model 參數
- [ ] 4.4 根據資料來源生成 system prompt：
  ```
  可用的資料來源：
  - sales_db (PostgreSQL): customers, orders, products 表
  - google_sheets: 可存取使用者的 Google Sheets
  ```
- [ ] 4.5 將檔案轉為 Claude vision 格式

## 5. UI 整合
- [ ] 5.1 調整輸入區 layout：
  ```
  [資料來源: sales_db, sheets] [模型: Sonnet ▼]
  ┌─────────────────────────────────────────┐
  │ [📎 image.png ✕]                        │
  │ 請幫我建立一個查詢訂單的工具...          │
  │                              [Send ➤]   │
  └─────────────────────────────────────────┘
  ```
- [ ] 5.2 響應式設計（手機版收合選項）
