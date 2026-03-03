# integrate-plausible

## Summary
新增 Plausible Analytics 唯讀整合，讓 AI 助手能查詢網站流量數據（訪客數、瀏覽量、跳出率、來源、頁面、UTM、地區等），以及即時訪客數。

## Motivation
使用者（行銷、BD、PM）需要在對話中快速查詢網站流量數據，例如「這週流量怎樣？」「Facebook 帶來多少人？」「哪個課程頁面最熱門？」。搭配 Slack/Asana/Notion 整合，可以將流量數據與工作脈絡串在一起。

## Scope
- **IN**: 聚合指標查詢、時間序列、維度拆分（來源/頁面/國家/裝置/UTM）、即時訪客數
- **OUT**: Sites API（建立/刪除站點）、Goals 管理、任何寫入操作、OAuth 流程

## Approach
比照 Slack/Asana 整合模式（環境變數 API Key + client + tools + system prompt）：

1. **Client 層** (`src/lib/integrations/plausible/client.ts`)：封裝 Plausible Stats API v2 + v1 realtime
2. **Tools 層** (`src/lib/ai/plausible-tools.ts`)：AI 工具定義
3. **Route 層**：chat route 註冊工具、status route 回報狀態
4. **UI 層**：資料來源選擇器加入 Plausible 選項
5. **System Prompt**：加入 Plausible 使用指南

## Authentication
- `PLAUSIBLE_API_KEY`：從 Plausible 帳號設定 > API Keys 產生（選 Stats API 類型）
- `PLAUSIBLE_SITE_ID`：網站域名（如 `example.com`）
- `PLAUSIBLE_BASE_URL`（選填）：self-hosted 用，預設 `https://plausible.io`

## API Notes
- Stats API v2 是單一 POST endpoint (`/api/v2/query`)，用 JSON body 描述查詢
- Realtime 用 v1 GET endpoint (`/api/v1/stats/realtime/visitors`)
- Rate limit: 600 req/hour
- 需要 Business 方案以上（$19/mo）或 self-hosted
