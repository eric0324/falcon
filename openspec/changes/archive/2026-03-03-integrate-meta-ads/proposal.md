# integrate-meta-ads

## Summary
新增 Meta Ads（Facebook Ads）唯讀整合，讓 AI 助手能透過 Graph API Insights endpoint 查詢廣告成效數據（帳戶總覽、行銷活動成效、時間序列、維度拆分），使用 System User Access Token 認證。

## Motivation
行銷團隊經常需要查詢 Meta（Facebook/Instagram）廣告成效數據。目前要登入 Ads Manager 才能看到，串接後使用者可在 Falcon 對話中直接用自然語言查詢廣告花費、曝光、點擊、轉換、ROAS 等指標，與 Plausible/GA4 並列在「網站數據」子選單中。

## Scope
- **IN**: 帳戶層級總覽（spend, impressions, clicks, CTR, CPC, conversions 等）、行銷活動/廣告組合/廣告層級成效、時間序列趨勢、維度拆分（age, gender, country, device_platform, publisher_platform）、日期範圍篩選
- **OUT**: 寫入操作（建立/修改廣告）、Creative 管理、Audience 管理、非同步大量查詢、Custom Conversions 設定

## Approach
比照 Plausible 整合模式（fetch-based，不用 SDK）：

1. **Client 層** (`src/lib/integrations/meta-ads/client.ts`)：直接用 `fetch` 呼叫 Graph API `/v21.0/act_{id}/insights`
2. **Tools 層** (`src/lib/ai/meta-ads-tools.ts`)：AI 工具定義，單一工具 `metaAdsQuery` + action 模式
3. **Route 層**：chat route 註冊工具、status route 回報狀態
4. **UI 層**：「網站數據」子選單加入 Meta Ads 選項
5. **System Prompt**：加入 Meta Ads 使用指南

## Authentication
使用 Meta System User Access Token（永不過期）：

- `META_ADS_ACCESS_TOKEN`：System User Access Token（需 `ads_read` 權限）
- `META_ADS_ACCOUNT_ID`：Ad Account ID（格式：`act_123456789`）

取得方式：
1. 在 Meta Business Manager > Business Settings > System Users 建立 System User
2. 授予 `ads_read` 權限
3. 生成 Access Token
4. 在 Business Settings > Accounts > Ad Accounts 取得 Account ID

## API Notes
- Graph API v21.0 `GET /act_{id}/insights`
- 支援 `time_range` 參數指定日期範圍
- 支援 `time_increment` 參數控制時間粒度（1=daily, 7=weekly, monthly）
- 支援 `breakdowns` 參數做維度拆分
- 支援 `level` 參數切換查詢層級（account, campaign, adset, ad）
- 支援 `filtering` 參數過濾特定行銷活動
- Rate limit：以 token 為單位，一般使用不易碰到
- 回傳格式：`{ data: [...], paging: { cursors, next } }`

## Dependencies
- 無新增 npm 套件（使用 Node.js 內建 `fetch`）
