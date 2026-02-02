# Tasks: Studio 對話增強功能

## UI 設計
```
┌─────────────────────────────────────────┐
│           [對話紀錄區域]                 │
│                                         │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ 描述你想要的功能...                      │
│                              [Send ➤]   │
└─────────────────────────────────────────┘
[Sonnet ▼] [📎 上傳] [🗄️ 資料來源 ▼]
```

## 1. 簡化 InitialSetupDialog
- [x] 1.1 移除資料來源選擇（移到對話輸入區）
- [x] 1.2 只保留工具名稱和描述

## 2. ModelSelector 元件
- [x] 2.1 建立 `src/components/model-selector.tsx`
- [x] 2.2 下拉選單顯示可用模型
- [x] 2.3 顯示模型名稱和簡短描述
- [x] 2.4 儲存使用者偏好（localStorage）
- [x] 2.5 整合到 studio page

## 3. 檔案上傳
- [x] 3.1 建立 `src/components/file-upload.tsx`
- [x] 3.2 點擊開啟檔案選擇
- [x] 3.3 支援的檔案類型：圖片(png/jpg/gif/webp)、文件(pdf/txt/md/csv)、程式碼(js/ts/json)
- [x] 3.4 檔案大小限制（10MB）
- [x] 3.5 顯示已上傳檔案列表（可移除）
- [x] 3.6 將檔案轉為 base64
- [x] 3.7 整合到 studio page

## 4. DataSourceSelector 元件
- [x] 4.1 建立 `src/components/data-source-selector.tsx`
- [x] 4.2 下拉選單 + 多選 checkbox
- [x] 4.3 從 API 取得可用資料來源
- [x] 4.4 顯示已選擇的資料來源數量
- [x] 4.5 整合到 studio page

## 5. 更新 Chat API
- [x] 5.1 接受 files 參數（base64 陣列）
- [x] 5.2 接受 dataSources 參數（name 陣列）
- [x] 5.3 根據 dataSources 查詢 schema 加入 system prompt
- [x] 5.4 將圖片檔案轉為 Claude vision 格式

## 6. Studio Page 整合
- [x] 6.1 調整輸入區 layout
- [x] 6.2 傳遞 model、files、dataSources 給 API
- [x] 6.3 在對話中顯示已上傳的檔案
