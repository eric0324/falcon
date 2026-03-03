# integrate-ga4

## Summary
新增 Google Analytics 4 唯讀整合，讓 AI 助手能透過 GA4 Data API v1 查詢網站流量數據（即時訪客、聚合指標、時間序列、維度拆分），使用 Service Account 認證。

## Motivation
許多團隊同時使用 GA4 和 Plausible，或只使用 GA4。GA4 提供更豐富的數據（事件、轉換、電商等），且是最廣泛使用的網站分析工具。串接後使用者可在對話中直接查詢 GA4 數據，與 Plausible 並列在「網站數據」子選單中。

## Scope
- **IN**: 即時訪客查詢、聚合指標（activeUsers, screenPageViews, sessions, bounceRate 等）、時間序列、維度拆分（source, pagePath, country, deviceCategory 等）、dimension filter
- **OUT**: 寫入操作、GA4 Admin API、Audience Export、電商進階報表、OAuth 流程

## Approach
比照 Plausible 整合模式：

1. **Client 層** (`src/lib/integrations/ga4/client.ts`)：使用 `@google-analytics/data` 套件的 `BetaAnalyticsDataClient`
2. **Tools 層** (`src/lib/ai/ga4-tools.ts`)：AI 工具定義，單一工具 `ga4Query` + action 模式
3. **Route 層**：chat route 註冊工具、status route 回報狀態
4. **UI 層**：「網站數據」子選單加入 GA4 選項
5. **System Prompt**：加入 GA4 使用指南

## Authentication
使用 Google Service Account（不走 OAuth）：

- `GA4_CLIENT_EMAIL`：Service Account 的 client_email
- `GA4_PRIVATE_KEY`：Service Account 的 private_key（PEM 格式）
- `GA4_PROPERTY_ID`：GA4 Property ID（純數字，如 `123456789`）

使用者需在 GA4 Admin > Property Access Management 將 service account email 加為 Viewer。

## API Notes
- 使用 `@google-analytics/data` npm 套件（`BetaAnalyticsDataClient`）
- `runReport()`: 歷史數據查詢（metrics + dimensions + dateRanges + filters）
- `runRealtimeReport()`: 即時數據（最近 30 分鐘）
- Rate limit: Token-based，標準版 200,000 tokens/天、40,000 tokens/小時
- Property ID 格式：純數字（非 G-XXXXXXX 測量 ID、非 UA-XXXXXXX）

## Dependencies
- 新增 npm 套件：`@google-analytics/data`
