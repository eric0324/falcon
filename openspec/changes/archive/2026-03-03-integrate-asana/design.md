# integrate-asana: Design

## Architecture

```
環境變數 (ASANA_PAT)
    ↓
Client 層 (src/lib/integrations/asana/)
    - isAsanaConfigured()
    - listProjects()
    - getProjectTasks(projectId)     → 含 section 分組
    - getTask(taskId)                → 任務詳情 + 子任務
    - getTaskStories(taskId)         → 留言/活動記錄
    - searchTasks(query)             → 搜尋任務
    ↓
Tools 層 (src/lib/ai/asana-tools.ts)
    - createAsanaTools()
    - 單一工具 asanaSearch（action 模式，同 Slack/Notion）
    ↓
Route 層
    - chat/route.ts: 註冊 asanaTools
    - integrations/status/route.ts: 回報 asana 狀態
    ↓
UI 層
    - data-source-selector.tsx: 加入 Asana 選項
    - system-prompt.ts: 加入 Asana 使用指南
```

## Tool Design

單一工具 + action 模式（同 Slack/Notion）：

```
asanaSearch({ action: "list" })
  → 列出所有專案 [{ id, name, status, dueOn, teamName }]

asanaSearch({ action: "tasks", projectId })
  → 專案的任務（按 section 分組）[{ section, tasks: [{ id, name, assignee, dueOn, completed }] }]

asanaSearch({ action: "read", taskId })
  → 任務詳情 + 子任務 { name, notes, assignee, dueOn, completed, subtasks, customFields }

asanaSearch({ action: "comments", taskId })
  → 任務留言 [{ user, text, createdAt }]

asanaSearch({ action: "search", search: "關鍵字" })
  → 搜尋任務 [{ id, name, projectName, assignee, completed }]
```

## Token & API

| 設定 | 說明 |
|------|------|
| `ASANA_PAT` | Personal Access Token，管理員產生 |
| Base URL | `https://app.asana.com/api/1.0/` |
| Auth | `Authorization: Bearer <PAT>` |
| Rate Limit | Starter: 1,500 req/min（search: 60 req/min） |

## opt_fields 策略

Asana 列表預設只回傳 `gid` + `name`，需要用 `opt_fields` 參數指定欄位。
為避免 token 浪費（Notion 的教訓），每個 action 只請求必要欄位：

- **list**: `name,current_status_update.title,due_on,team.name,archived`
- **tasks**: `name,assignee.name,due_on,completed,memberships.section.name,num_subtasks`
- **read**: `name,notes,assignee.name,due_on,due_at,completed,completed_at,custom_fields.display_value,custom_fields.name,num_subtasks`
- **comments**: 用 stories endpoint，過濾 `resource_subtype=comment_added`
- **search**: `name,assignee.name,completed,projects.name`

## Workspace 處理

PAT 使用者可能屬於多個 workspace。策略：
- 第一次呼叫時自動取得 workspace 列表
- 如果只有一個 workspace，直接使用
- 如果有多個，預設使用第一個（或透過 `ASANA_WORKSPACE_ID` 環境變數指定）

## Decisions

1. **不用官方 SDK**：直接用 fetch，同 Slack/Notion 做法，最小依賴
2. **不用 OAuth**：同 Slack/Notion，環境變數 PAT
3. **Stories 過濾**：只回傳 comment 類型的 story，忽略系統自動產生的活動記錄（如「移動到某 section」）
4. **Section 分組**：tasks action 用 section 分組回傳，讓 AI 能理解看板/列表結構
