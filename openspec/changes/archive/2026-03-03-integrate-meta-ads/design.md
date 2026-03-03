# integrate-meta-ads: Design

## Architecture

```
環境變數 (META_ADS_ACCESS_TOKEN, META_ADS_ACCOUNT_ID)
    |
Client 層 (src/lib/integrations/meta-ads/)
    - isMetaAdsConfigured()
    - queryOverview(dateRange)              → 帳戶層級總覽
    - queryCampaigns(dateRange, limit?)     → 行銷活動層級成效
    - queryTimeseries(dateRange, period?)   → 每日/每週趨勢
    - queryBreakdown(dimension, dateRange)  → 維度拆分
    |
Tools 層 (src/lib/ai/meta-ads-tools.ts)
    - createMetaAdsTools()
    - 單一工具 metaAdsQuery（action 模式，同 Plausible/GA4）
    |
Route 層
    - chat/route.ts: 註冊 metaAdsTools
    - integrations/status/route.ts: 回報 meta_ads 狀態
    |
UI 層
    - data-source-selector.tsx:「網站數據」子選單加入 Meta Ads
    - system-prompt.ts: 加入 Meta Ads 使用指南
```

## Tool Design

單一工具 + action 模式（同 Plausible/GA4）：

```
metaAdsQuery({ action: "overview", dateRange: "last_7d" })
  → 帳戶總覽 { spend, impressions, clicks, ctr, cpc, cpm, reach, frequency, conversions, costPerResult }

metaAdsQuery({ action: "campaigns", dateRange: "last_30d" })
  → 行銷活動列表 [{ campaignName, campaignId, status, spend, impressions, clicks, ctr, cpc, conversions }]

metaAdsQuery({ action: "timeseries", dateRange: "last_30d", period: "day" })
  → 時間序列 [{ date, spend, impressions, clicks }]

metaAdsQuery({ action: "breakdown", dimension: "age", dateRange: "last_7d" })
  → 維度拆分 [{ dimension: "25-34", spend, impressions, clicks, ctr }]
```

## API Endpoint

所有查詢共用同一個 endpoint：

```
GET https://graph.facebook.com/v21.0/{account_id}/insights?
  access_token={token}&
  fields={metrics}&
  time_range={"since":"2026-01-01","until":"2026-01-31"}&
  time_increment=1&
  level=campaign&
  breakdowns=age
```

## Core Metrics（10 個）

| Graph API Field | Tool 回傳 key | 說明 |
|----------------|--------------|------|
| `spend` | spend | 花費金額 |
| `impressions` | impressions | 曝光次數 |
| `clicks` | clicks | 點擊次數 |
| `ctr` | ctr | 點擊率 (%) |
| `cpc` | cpc | 每次點擊成本 |
| `cpm` | cpm | 每千次曝光成本 |
| `reach` | reach | 觸及人數 |
| `frequency` | frequency | 頻次 |
| `actions` | conversions | 轉換次數（從 actions 陣列提取） |
| `cost_per_action_type` | costPerResult | 每次轉換成本（從陣列提取） |

## Breakdown Dimensions

| 簡化名稱 | Graph API Name | 說明 |
|---------|---------------|------|
| age | age | 年齡層 (18-24, 25-34, ...) |
| gender | gender | 性別 (male, female, unknown) |
| country | country | 國家 |
| platform | publisher_platform | 平台 (facebook, instagram, audience_network) |
| device | device_platform | 裝置 (mobile, desktop) |
| placement | platform_position | 版位 (feed, story, reels, ...) |

## Date Range 策略

Meta Graph API 使用 `time_range` 物件：

| Tool 參數 | since | until | 說明 |
|----------|-------|-------|------|
| `today` | 今天 | 今天 | |
| `yesterday` | 昨天 | 昨天 | |
| `last_7d` | 7 天前 | 昨天 | Meta 預設不含今天 |
| `last_14d` | 14 天前 | 昨天 | |
| `last_30d` | 30 天前 | 昨天 | |
| `this_month` | 本月 1 日 | 今天 | |
| `last_month` | 上月 1 日 | 上月最後一天 | |
| `custom` | startDate 參數 | endDate 參數 | |

注意：Meta API 不含 `until` 當天的資料（Meta 的 `until` 是排除的），所以 `last_7d` 的 until 設為「昨天」。

## Conversions 處理

Meta 的 `actions` 和 `cost_per_action_type` 是陣列格式：
```json
{
  "actions": [
    { "action_type": "link_click", "value": "150" },
    { "action_type": "landing_page_view", "value": "120" },
    { "action_type": "purchase", "value": "10" }
  ]
}
```

Client 層提取策略：
- `conversions`：取 `actions` 中所有 action 的總和，或取 `actions` 陣列完整回傳讓 AI 分析
- `costPerResult`：同上，從 `cost_per_action_type` 陣列提取

為了簡化，**overview 和 campaigns 回傳完整 actions 陣列**，讓 AI 根據使用者問題自行解讀。

## Configuration

| 環境變數 | 必填 | 說明 |
|---------|------|------|
| `META_ADS_ACCESS_TOKEN` | Yes | System User Access Token |
| `META_ADS_ACCOUNT_ID` | Yes | Ad Account ID（含 `act_` 前綴） |

## Decisions

1. **使用 fetch 而非 SDK**：只做 Insights 讀取，`facebook-nodejs-business-sdk` 太重（包含整個 Marketing API），fetch 更輕量簡潔。
2. **Meta `until` 排除行為**：Meta API 的 `until` 不含當天資料，需要在 client 層額外處理（today 要把 until 設為明天）。
3. **actions 陣列完整回傳**：不在 client 層做過多轉換，將 actions 完整回傳讓 AI 解讀，因為不同廣告目標的「轉換」定義不同。
4. **Metrics 固定 8 個核心 + actions 陣列**：spend, impressions, clicks, ctr, cpc, cpm, reach, frequency 固定請求，加上 actions 和 cost_per_action_type 陣列。
5. **campaigns action 同時回傳名稱和狀態**：方便 AI 識別哪些行銷活動正在投放。
