# Tasks: Studio 歷史對話紀錄

## 1. 側邊欄 Layout
- [x] 1.1 調整 Studio 為三欄式佈局：
  ```
  [歷史] [對話] [預覽]
   240px   1fr    1fr
  ```
- [x] 1.2 側邊欄可收合（漢堡選單 toggle）
- [x] 1.3 收合時只顯示 icon
- [x] 1.4 手機版預設收合

## 2. 對話列表 API
- [x] 2.1 GET `/api/conversations` - 取得使用者的對話列表
- [x] 2.2 回傳欄位：id, title, toolName, updatedAt
- [x] 2.3 按 updatedAt 降序排列
- [x] 2.4 DELETE `/api/conversations/[id]` - 刪除對話

## 3. 對話列表 UI
- [x] 3.1 建立 ConversationList 元件
- [x] 3.2 每個項目顯示：
  - 對話標題（取第一則訊息前 30 字，或工具名稱）
  - 相對時間（2 小時前、昨天等）
  - 工具名稱 badge（如已部署）
- [x] 3.3 hover 顯示刪除按鈕
- [x] 3.4 目前對話 highlight
- [x] 3.5 空狀態提示

## 4. 載入歷史對話
- [x] 4.1 GET `/api/conversations/[id]` - 取得單一對話完整內容
- [x] 4.2 點擊列表項目時載入對話
- [x] 4.3 還原 messages state
- [x] 4.4 還原 code（如有）
- [x] 4.5 URL 更新為 `/studio?conversation={id}`

## 5. 新建對話
- [x] 5.1 「新對話」按鈕置頂
- [x] 5.2 清空目前對話 state
- [x] 5.3 重置 URL 為 `/studio`
- [x] 5.4 確認對話框（如目前有未儲存內容）

## 6. 自動儲存對話
- [x] 6.1 每次送出訊息後更新 Conversation
- [x] 6.2 新對話時自動建立 Conversation 記錄
- [x] 6.3 更新 updatedAt timestamp
