# integrate-plausible: Design

## Architecture

```
環境變數 (PLAUSIBLE_API_KEY, PLAUSIBLE_SITE_ID, PLAUSIBLE_BASE_URL?)
    |
Client 層 (src/lib/integrations/plausible/)
    - isPlausibleConfigured()
    - getRealtimeVisitors()           → 即時訪客數（v1）
    - queryAggregate(dateRange, filters?)    → 聚合指標
    - queryTimeseries(dateRange, period, filters?)  → 時間序列
    - queryBreakdown(dimension, dateRange, filters?)  → 維度拆分
    |
Tools 層 (src/lib/ai/plausible-tools.ts)
    - createPlausibleTools()
    - 單一工具 plausibleQuery（action 模式，同 Slack/Asana）
    |
Route 層
    - chat/route.ts: 註冊 plausibleTools
    - integrations/status/route.ts: 回報 plausible 狀態
    |
UI 層
    - data-source-selector.tsx: 加入 Plausible 選項
    - system-prompt.ts: 加入 Plausible 使用指南
```

## Tool Design

單一工具 + action 模式（同 Slack/Asana）：

```
plausibleQuery({ action: "realtime" })
  → 即時訪客數 { visitors: 42 }

plausibleQuery({ action: "aggregate", dateRange: "30d" })
  → 聚合指標 { visitors, pageviews, visits, bounceRate, visitDuration, viewsPerVisit }

plausibleQuery({ action: "timeseries", dateRange: "30d", period: "day" })
  → 時間序列 [{ date, visitors, pageviews }]

plausibleQuery({ action: "breakdown", dimension: "visit:source", dateRange: "7d" })
  → 維度拆分 [{ dimension: "Google", visitors: 120, pageviews: 340 }]
```

## API Mapping

### v2 Query API (POST /api/v2/query)

所有查詢共用同一 endpoint，差別在 JSON body：

| Action | dimensions | metrics | 說明 |
|--------|-----------|---------|------|
| aggregate | (none) | all 6 metrics | 總計數字 |
| timeseries | time:day/week/month | visitors, pageviews | 時間趨勢 |
| breakdown | visit:source / event:page / visit:country / etc. | visitors, pageviews | 按維度拆分 |

### v1 Realtime API (GET /api/v1/stats/realtime/visitors)
回傳純數字（目前在線人數，過去 5 分鐘）。

## Configuration

| 環境變數 | 必填 | 說明 |
|---------|------|------|
| `PLAUSIBLE_API_KEY` | Yes | Stats API key（Bearer token） |
| `PLAUSIBLE_SITE_ID` | Yes | 網站域名（如 example.com） |
| `PLAUSIBLE_BASE_URL` | No | self-hosted URL，預設 `https://plausible.io` |

## Date Range 策略

支援 Plausible 的快捷日期範圍，讓 AI 容易使用：

| 值 | 說明 |
|----|------|
| `day` | 今天 |
| `7d` | 過去 7 天 |
| `30d` | 過去 30 天 |
| `month` | 本月 |
| `6mo` | 過去 6 個月 |
| `12mo` | 過去 12 個月 |
| `custom` | 自訂範圍（需帶 startDate, endDate） |

## Filter 策略

簡化 Plausible 的 filter 語法，讓 AI 用扁平參數傳入：

- `page`：頁面路徑篩選（如 `/blog`）
- `source`：來源篩選（如 `Google`）
- `country`：國家篩選（如 `TW`）
- `device`：裝置篩選（如 `Mobile`）
- `utm_source` / `utm_medium` / `utm_campaign`：UTM 篩選

Client 層負責把這些扁平參數轉換成 Plausible v2 的 filter 格式 `["is", dimension, [value]]`。

## Decisions

1. **不暴露完整 v2 query 語法**：Plausible 的 filter/dimension 語法複雜，直接暴露給 AI 容易出錯。用簡化的 action + 扁平 filter 參數，client 層做轉換。
2. **Metrics 固定組合**：aggregate 回傳所有 6 個核心指標，不讓 AI 選擇（避免遺漏重要數據）。
3. **Realtime 用 v1**：v2 不支援 realtime，用 v1 legacy endpoint。
4. **不用官方 SDK**：直接用 fetch，同其他整合做法。
