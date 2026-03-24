# Vimeo Integration Specification

## Purpose
讓使用者透過 OAuth 連接 Vimeo 帳號，AI 可查詢影片資料與觀看分析。

## ADDED Requirements

### Requirement: Vimeo OAuth Authentication
使用者 SHALL 能透過 OAuth 2.0 連接 Vimeo 帳號。

#### Scenario: Initiate Vimeo connection
- GIVEN 使用者尚未連接 Vimeo
- WHEN 使用者在資料來源選擇器點擊「連接」
- THEN 系統導向 Vimeo OAuth 授權頁面
- AND 請求 `public`, `private`, `stats` scope

#### Scenario: OAuth callback success
- GIVEN 使用者在 Vimeo 授權頁同意授權
- WHEN callback 收到 authorization code
- THEN 系統以 code 換取 access token
- AND token 加密後存入 `UserVimeoToken` table
- AND 導回前端並顯示連線成功

#### Scenario: OAuth callback denied
- GIVEN 使用者在 Vimeo 授權頁拒絕授權
- WHEN callback 收到 error 參數
- THEN 導回前端並顯示連線取消

#### Scenario: Disconnect Vimeo
- GIVEN 使用者已連接 Vimeo
- WHEN 使用者點擊「中斷連線」
- THEN 系統刪除 `UserVimeoToken` 記錄
- AND 資料來源選擇器顯示未連接狀態

### Requirement: Vimeo Video Query
AI SHALL 能查詢使用者的 Vimeo 影片資料。

#### Scenario: List user videos
- GIVEN 使用者已連接 Vimeo
- WHEN AI 以 action=`videos` 呼叫 vimeoQuery
- THEN 回傳影片清單，包含名稱、說明、時長、觀看次數、上傳日期
- AND 支援分頁（maxResults 參數）

#### Scenario: Get video details
- GIVEN 使用者已連接 Vimeo
- WHEN AI 以 action=`video` 和 videoId 呼叫 vimeoQuery
- THEN 回傳單支影片的完整資訊（名稱、說明、時長、觀看次數、按讚數、留言數、隱私設定、縮圖 URL）

#### Scenario: List folders
- GIVEN 使用者已連接 Vimeo
- WHEN AI 以 action=`folders` 呼叫 vimeoQuery
- THEN 回傳資料夾清單，包含名稱、影片數量、建立日期

#### Scenario: List folder videos
- GIVEN 使用者已連接 Vimeo
- WHEN AI 以 action=`folder_videos` 和 folderId 呼叫 vimeoQuery
- THEN 回傳該資料夾內的影片清單

#### Scenario: Not connected
- GIVEN 使用者尚未連接 Vimeo
- WHEN AI 嘗試呼叫 vimeoQuery
- THEN 回傳 `{ success: false, error: "Vimeo 尚未連接", needsConnection: true }`

### Requirement: Vimeo Analytics Query
AI SHALL 能查詢使用者的 Vimeo 觀看分析資料。

#### Scenario: Query analytics with date range
- GIVEN 使用者已連接 Vimeo 且帳號有 stats 權限
- WHEN AI 以 action=`analytics` 呼叫 vimeoQuery，帶 startDate、endDate、dimension、metrics
- THEN 回傳分析資料（觀看次數、不重複觀看者、平均觀看百分比等）

#### Scenario: Analytics not available
- GIVEN 使用者的 Vimeo 帳號沒有 stats 權限
- WHEN AI 以 action=`analytics` 呼叫 vimeoQuery
- THEN 回傳 `{ success: false, error: "此 Vimeo 帳號不支援分析功能，需要 Pro 以上方案" }`

### Requirement: Vimeo Bridge Handler
已發布的工具 SHALL 能在 runtime 透過 bridge 存取 Vimeo 資料。

#### Scenario: Bridge dispatch
- GIVEN 工具的 dataSources 包含 "vimeo"
- WHEN 工具透過 `window.companyAPI.execute("vimeo", action, params)` 呼叫
- THEN bridge 路由至 handleVimeo handler
- AND 使用工具擁有者的 Vimeo token 執行查詢
- AND 回傳結果至工具

#### Scenario: Bridge without connection
- GIVEN 工具擁有者未連接 Vimeo
- WHEN 工具透過 bridge 呼叫 Vimeo
- THEN 回傳 `{ error: "Vimeo not connected" }`

### Requirement: Vimeo Data Source UI
資料來源選擇器 SHALL 顯示 Vimeo 選項。

#### Scenario: Show Vimeo in selector
- WHEN 使用者開啟資料來源選擇器
- THEN 在「影音平台」分類下顯示 Vimeo
- AND 顯示目前的連線狀態（已連接 / 未連接）

#### Scenario: Connection status check
- WHEN 資料來源選擇器載入
- THEN 呼叫 `/api/integrations/status` 取得 Vimeo 連線狀態
- AND 已連接時顯示勾勾圖示
