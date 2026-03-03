# Tasks: Studio Chat-First 體驗

## 版面示意

```
預設（純對話）：
┌─────────────────────────────────────────────────┐
│                   全寬對話區域                     │
│                                                   │
│  使用者：幫我查一下最近的訂單狀況                  │
│  AI：[查詢資料來源] 以下是最近 5 筆訂單...         │
│                                                   │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│ 問點什麼...                           [Send ➤]  │
└─────────────────────────────────────────────────┘
[Sonnet ▼] [📎 上傳] [🗄️ 資料來源 ▼]


產生程式碼後（自動展開）：
┌───────────────────────┬─────────────────────────┐
│      對話區域          │      預覽面板            │
│                       │                         │
└───────────────────────┴─────────────────────────┘
                                        [發布工具]
```

## 1. 移除 InitialSetupDialog
- [x] 1.1 Studio page 移除 `showInitialSetup` state 和 `handleInitialSetup`、`handleCancelSetup`
- [x] 1.2 移除 `<InitialSetupDialog>` render
- [x] 1.3 移除 `toolName`、`toolDescription` 的初始化依賴（改由 DeployDialog 處理）
- [x] 1.4 更新空狀態提示文字（不再顯示工具名稱，改為通用歡迎訊息）

## 2. 自適應版面
- [x] 2.1 新增 `hasCode` 衍生狀態（`code.length > 0`）
- [x] 2.2 無程式碼時：對話區域全寬，不 render PreviewPanel
- [x] 2.3 有程式碼時：切換為 50/50 分割，展開 PreviewPanel
- [x] 2.4 加入 layout 過渡動畫（CSS transition-all duration-300）

## 3. 條件式 Header
- [x] 3.1 發布/儲存按鈕僅在 `hasCode` 時顯示
- [x] 3.2 重置按鈕維持始終顯示
- [x] 3.3 標題顯示「Studio」而非工具名稱

## 4. 更新 System Prompt
- [x] 4.1 調整 base prompt：不再強制「一定要輸出程式碼」，而是根據使用者意圖回應
- [x] 4.2 保留程式碼產生規則，但作為「當需要產生 UI 時」的子區塊
- [x] 4.3 新增「一般對話」指引：可以回答問題、分析資料、提供建議
- [x] 4.4 抽出 system-prompt.ts 獨立模組，包含 11 個單元測試

## 5. 清理
- [x] 5.1 確認 DeployDialog 的 `defaultName` 為空時仍可正常填寫
- [x] 5.2 handleReset 更新：不再設定 `showInitialSetup(true)`，只清空對話和程式碼
- [x] 5.3 移除 initial-setup-dialog.tsx 檔案（不再使用）
