# Asana Read Integration

## ADDED Requirements

### Requirement: Asana Configuration Check
系統 SHALL 能偵測 Asana 是否已設定。

#### Scenario: PAT configured
- **Given** 環境變數 `ASANA_PAT` 已設定
- **When** 系統檢查 Asana 狀態
- **Then** 回傳 `configured: true`

#### Scenario: PAT not configured
- **Given** 環境變數 `ASANA_PAT` 未設定
- **When** 系統檢查 Asana 狀態
- **Then** 回傳 `configured: false`

---

### Requirement: List Projects
系統 SHALL 讓 AI 列出 workspace 中的所有專案。

#### Scenario: List projects successfully
- **Given** Asana 已設定且 workspace 中有專案
- **When** AI 呼叫 `asanaSearch({ action: "list" })`
- **Then** 回傳專案清單，每筆包含 `{ id, name, status, dueOn, teamName }`
- **And** 不包含已封存的專案

#### Scenario: Asana not configured
- **Given** Asana 未設定
- **When** AI 呼叫 `asanaSearch({ action: "list" })`
- **Then** 回傳 `{ success: false, needsConnection: true }`

---

### Requirement: Get Project Tasks
系統 SHALL 讓 AI 讀取專案中的任務，MUST 按 section 分組回傳。

#### Scenario: Get tasks with sections
- **Given** 專案有多個 section（如「待辦」「進行中」「已完成」）
- **When** AI 呼叫 `asanaSearch({ action: "tasks", projectId: "12345" })`
- **Then** 回傳任務清單，按 section 分組
- **And** 每筆任務包含 `{ id, name, assignee, dueOn, completed }`

---

### Requirement: Read Task Details
系統 SHALL 讓 AI 讀取任務的完整詳情，包含子任務。

#### Scenario: Read task with subtasks
- **Given** 任務存在且有子任務
- **When** AI 呼叫 `asanaSearch({ action: "read", taskId: "12345" })`
- **Then** 回傳任務詳情 `{ name, notes, assignee, dueOn, completed, customFields, subtasks }`
- **And** subtasks 包含 `[{ id, name, completed }]`

#### Scenario: Read task without subtasks
- **Given** 任務存在但沒有子任務
- **When** AI 呼叫 `asanaSearch({ action: "read", taskId: "12345" })`
- **Then** 回傳任務詳情，subtasks 為空陣列

---

### Requirement: Read Task Comments
系統 SHALL 讓 AI 讀取任務上的留言，MUST 過濾掉系統自動產生的活動記錄。

#### Scenario: Read comments successfully
- **Given** 任務有留言和系統活動記錄
- **When** AI 呼叫 `asanaSearch({ action: "comments", taskId: "12345" })`
- **Then** 只回傳人工留言（resource_subtype 為 comment_added）
- **And** 每筆包含 `{ user, text, createdAt }`

#### Scenario: Task with no comments
- **Given** 任務沒有留言
- **When** AI 呼叫 `asanaSearch({ action: "comments", taskId: "12345" })`
- **Then** 回傳空陣列 `{ data: [], rowCount: 0 }`

---

### Requirement: Search Tasks
系統 SHALL 讓 AI 搜尋 workspace 中的任務。

#### Scenario: Search tasks successfully
- **Given** Asana workspace 為 Starter 以上方案
- **When** AI 呼叫 `asanaSearch({ action: "search", search: "關鍵字" })`
- **Then** 回傳符合的任務清單，每筆包含 `{ id, name, projectName, assignee, completed }`

#### Scenario: Search with no results
- **Given** 搜尋關鍵字沒有匹配的任務
- **When** AI 呼叫 `asanaSearch({ action: "search", search: "不存在的關鍵字" })`
- **Then** 回傳空陣列 `{ data: [], rowCount: 0 }`

---

### Requirement: Data Source Selector Integration
系統 SHALL 在資料來源選擇器中顯示 Asana 選項。

#### Scenario: Asana appears in selector
- **Given** Asana 已設定（`ASANA_PAT` 存在）
- **When** 使用者開啟資料來源選擇器
- **Then** 第三方服務子選單中顯示 Asana 選項，可勾選

#### Scenario: Asana not configured in selector
- **Given** Asana 未設定
- **When** 使用者開啟資料來源選擇器
- **Then** Asana 選項顯示「未設定」，不可勾選

---

### Requirement: Chat Route Tool Registration
系統 SHALL 根據資料來源選擇動態載入 Asana 工具。

#### Scenario: Asana selected as data source
- **Given** 使用者選擇了 Asana 資料來源
- **When** 發送聊天訊息
- **Then** chat route 將 asanaTools 加入可用工具

#### Scenario: Asana not selected
- **Given** 使用者未選擇 Asana
- **When** 發送聊天訊息
- **Then** asanaTools 不在可用工具中

---

### Requirement: System Prompt Asana Guide
系統 SHALL 在 Asana 被選為資料來源時，於 system prompt 中包含使用指南。

#### Scenario: Asana guide in system prompt
- **Given** 使用者選擇了 Asana 資料來源
- **When** 建構 system prompt
- **Then** 包含 Asana 工具使用說明和搜尋策略
