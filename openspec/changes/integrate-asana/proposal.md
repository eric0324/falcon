# integrate-asana

## Summary
新增 Asana 唯讀整合，讓 AI 助手能讀取專案、任務、子任務、留言，以及搜尋任務。不包含任何寫入功能。

## Motivation
使用者需要在對話中查詢 Asana 專案進度、任務狀態、留言討論，搭配 Notion 文件和 Slack 對話記錄，提供完整的工作脈絡。

## Scope
- **IN**: 列出專案、讀取專案任務（含 section 分組）、讀取任務詳情與子任務、讀取任務留言、搜尋任務
- **OUT**: 建立/更新/刪除任務、OAuth 流程、寫入任何資料

## Approach
比照 Slack 整合模式（環境變數 PAT + client + tools + system prompt）：

1. **Client 層** (`src/lib/integrations/asana/client.ts`)：封裝 Asana REST API
2. **Tools 層** (`src/lib/ai/asana-tools.ts`)：AI 工具定義
3. **Route 層**：chat route 註冊工具、status route 回報狀態
4. **UI 層**：資料來源選擇器加入 Asana 選項
5. **System Prompt**：加入 Asana 使用指南

## Authentication
- `ASANA_PAT`：Personal Access Token，管理員從 Asana 開發者設定產生
- 無過期時間，直到手動撤銷
- 注意：PAT 無法限制為 read-only，但程式碼只呼叫 GET endpoints
