# integrate-slack

## Summary
新增 Slack 唯讀整合，讓 AI 助手能讀取公開頻道訊息、討論串，以及搜尋公開頻道對話記錄。不包含任何寫入功能。

## Motivation
使用者需要在對話中查詢 Slack 內容（如會議討論、決策記錄），與現有的 Notion、Google 資料搭配使用，提供更完整的上下文。

## Scope
- **IN**: 讀取公開頻道列表、讀取頻道訊息、讀取討論串、搜尋訊息（過濾僅公開頻道）
- **OUT**: 發送訊息、加反應、建立頻道、私有頻道、DM、OAuth 流程

## Approach
遵循 Notion 整合模式（環境變數 token + client + tools + system prompt）：

1. **Client 層** (`src/lib/integrations/slack/client.ts`)：封裝 Slack Web API
2. **Tools 層** (`src/lib/ai/slack-tools.ts`)：AI 工具定義
3. **Route 層**：chat route 註冊工具、status route 回報狀態
4. **UI 層**：資料來源選擇器加入 Slack 選項
5. **System Prompt**：加入 Slack 使用指南

## Authentication
- `SLACK_BOT_TOKEN` (xoxb-)：讀取頻道列表、頻道訊息、討論串
- `SLACK_USER_TOKEN` (xoxp-)：搜尋訊息（管理員的 token，全系統共用）

## Privacy
- Bot 只能讀取它被加入的公開頻道
- 搜尋結果過濾掉 `is_private === true` 的頻道，確保 AI 只看到公開內容
- 不申請 `im:history`、`mpim:history` 等 DM 相關 scope
