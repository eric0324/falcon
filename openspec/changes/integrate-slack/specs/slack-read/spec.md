# Slack Read Integration

## ADDED Requirements

### Requirement: Slack Configuration Check
系統 SHALL 能偵測 Slack 是否已設定。

#### Scenario: Bot token configured
- **Given** 環境變數 `SLACK_BOT_TOKEN` 已設定
- **When** 系統檢查 Slack 狀態
- **Then** 回傳 `configured: true`

#### Scenario: Bot token not configured
- **Given** 環境變數 `SLACK_BOT_TOKEN` 未設定
- **When** 系統檢查 Slack 狀態
- **Then** 回傳 `configured: false`

#### Scenario: Search token not configured
- **Given** `SLACK_BOT_TOKEN` 已設定但 `SLACK_USER_TOKEN` 未設定
- **When** AI 嘗試搜尋
- **Then** 回傳提示「搜尋功能未啟用，請設定 SLACK_USER_TOKEN」

---

### Requirement: List Public Channels
系統 SHALL 讓 AI 列出 Bot 已加入的公開頻道。

#### Scenario: List channels successfully
- **Given** Slack 已設定且 Bot 已加入頻道
- **When** AI 呼叫 `slackSearch({ action: "list" })`
- **Then** 回傳頻道清單，每筆包含 `{ id, name, topic, memberCount }`

#### Scenario: Slack not configured
- **Given** Slack 未設定
- **When** AI 呼叫 `slackSearch({ action: "list" })`
- **Then** 回傳 `{ success: false, needsConnection: true }`

---

### Requirement: Read Channel Messages
系統 SHALL 讓 AI 讀取指定公開頻道的訊息。

#### Scenario: Read messages successfully
- **Given** Slack 已設定且頻道存在
- **When** AI 呼叫 `slackSearch({ action: "read", channelId: "C01234" })`
- **Then** 回傳訊息清單，每筆包含 `{ user, text, ts, replyCount }`
- **And** user 欄位為顯示名稱（非 userId）

#### Scenario: Read with limit
- **Given** 頻道有 100 則訊息
- **When** AI 呼叫 `slackSearch({ action: "read", channelId: "C01234", limit: 10 })`
- **Then** 回傳最新 10 則訊息

---

### Requirement: Read Thread Replies
系統 SHALL 讓 AI 讀取指定討論串的回覆。

#### Scenario: Read thread successfully
- **Given** 頻道中有討論串
- **When** AI 呼叫 `slackSearch({ action: "thread", channelId: "C01234", threadTs: "1234567890.123456" })`
- **Then** 回傳討論串所有回覆，每筆包含 `{ user, text, ts }`

---

### Requirement: Search Messages (Public Only)
系統 SHALL 讓 AI 搜尋訊息，且結果 MUST 僅包含公開頻道內容。

#### Scenario: Search returns only public channel results
- **Given** 搜尋結果包含公開和私有頻道訊息
- **When** AI 呼叫 `slackSearch({ action: "search", search: "關鍵字" })`
- **Then** 回傳結果僅包含 `is_private === false` 的頻道訊息
- **And** 每筆包含 `{ channel, user, text, ts, permalink }`

#### Scenario: Search with no public results
- **Given** 搜尋結果全部來自私有頻道
- **When** AI 呼叫 `slackSearch({ action: "search", search: "關鍵字" })`
- **Then** 回傳空清單 `{ data: [], rowCount: 0 }`

---

### Requirement: Data Source Selector Integration
系統 SHALL 在資料來源選擇器中顯示 Slack 選項。

#### Scenario: Slack appears in selector
- **Given** Slack 已設定（`SLACK_BOT_TOKEN` 存在）
- **When** 使用者開啟資料來源選擇器
- **Then** 第三方服務子選單中顯示 Slack 選項，可勾選

#### Scenario: Slack not configured in selector
- **Given** Slack 未設定
- **When** 使用者開啟資料來源選擇器
- **Then** Slack 選項顯示「未設定」，不可勾選

---

### Requirement: Chat Route Tool Registration
系統 SHALL 根據資料來源選擇動態載入 Slack 工具。

#### Scenario: Slack selected as data source
- **Given** 使用者選擇了 Slack 資料來源
- **When** 發送聊天訊息
- **Then** chat route 將 slackTools 加入可用工具

#### Scenario: Slack not selected
- **Given** 使用者未選擇 Slack
- **When** 發送聊天訊息
- **Then** slackTools 不在可用工具中

---

### Requirement: System Prompt Slack Guide
系統 SHALL 在 Slack 被選為資料來源時，於 system prompt 中包含使用指南。

#### Scenario: Slack guide in system prompt
- **Given** 使用者選擇了 Slack 資料來源
- **When** 建構 system prompt
- **Then** 包含 Slack 工具使用說明和搜尋策略
