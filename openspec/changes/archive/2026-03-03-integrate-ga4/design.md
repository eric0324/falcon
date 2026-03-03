# integrate-ga4: Design

## Architecture

```
環境變數 (GA4_CLIENT_EMAIL, GA4_PRIVATE_KEY, GA4_PROPERTY_ID)
    |
Client 層 (src/lib/integrations/ga4/)
    - isGA4Configured()
    - getRealtimeUsers()              → 即時活躍用戶（runRealtimeReport）
    - queryAggregate(dateRange)        → 聚合指標
    - queryTimeseries(dateRange, period) → 時間序列
    - queryBreakdown(dimension, dateRange) → 維度拆分
    |
Tools 層 (src/lib/ai/ga4-tools.ts)
    - createGA4Tools()
    - 單一工具 ga4Query（action 模式，同 Plausible）
    |
Route 層
    - chat/route.ts: 註冊 ga4Tools
    - integrations/status/route.ts: 回報 ga4 狀態
    |
UI 層
    - data-source-selector.tsx:「網站數據」子選單加入 GA4
    - system-prompt.ts: 加入 GA4 使用指南
```

## Tool Design

單一工具 + action 模式（同 Plausible）：

```
ga4Query({ action: "realtime" })
  → 即時活躍用戶 { activeUsers: 42 }

ga4Query({ action: "aggregate", dateRange: "30d" })
  → 聚合指標 { activeUsers, screenPageViews, sessions, bounceRate, averageSessionDuration, sessionsPerUser }

ga4Query({ action: "timeseries", dateRange: "30d", period: "day" })
  → 時間序列 [{ date, activeUsers, screenPageViews }]

ga4Query({ action: "breakdown", dimension: "source", dateRange: "7d" })
  → 維度拆分 [{ dimension: "google", activeUsers: 120, screenPageViews: 340 }]
```

## API Mapping

### runReport (historical data)

| Action | dimensions | metrics | 說明 |
|--------|-----------|---------|------|
| aggregate | (none) | 6 core metrics | 總計數字 |
| timeseries | date/dateHour | activeUsers, screenPageViews | 時間趨勢 |
| breakdown | source/pagePath/country/etc. | activeUsers, screenPageViews | 按維度拆分 |

### runRealtimeReport (last 30 minutes)

回傳即時活躍用戶數，可選維度拆分。

## Core Metrics（固定 6 個）

| GA4 API Name | Tool 回傳 key | 說明 |
|-------------|--------------|------|
| `activeUsers` | activeUsers | 活躍使用者 |
| `screenPageViews` | screenPageViews | 頁面瀏覽量 |
| `sessions` | sessions | 工作階段數 |
| `bounceRate` | bounceRate | 跳出率 |
| `averageSessionDuration` | averageSessionDuration | 平均工作階段時長（秒） |
| `sessionsPerUser` | sessionsPerUser | 每使用者工作階段數 |

## Dimension Mapping

| 簡化名稱 | GA4 API Name | 說明 |
|---------|-------------|------|
| source | sessionSource | 來源 |
| medium | sessionMedium | 媒介 |
| channel | defaultChannelGroup | 頻道群組 |
| page | pagePath | 頁面路徑 |
| landing_page | landingPage | 到達頁面 |
| country | country | 國家 |
| city | city | 城市 |
| device | deviceCategory | 裝置類型 |
| browser | browser | 瀏覽器 |
| os | operatingSystem | 作業系統 |
| event | eventName | 事件名稱 |

## Date Range 策略

GA4 用 `startDate` + `endDate`，支援相對日期字串：

| Tool 參數 | GA4 startDate | GA4 endDate |
|----------|-------------|------------|
| `today` | today | today |
| `yesterday` | yesterday | yesterday |
| `7d` | 7daysAgo | today |
| `30d` | 30daysAgo | today |
| `90d` | 90daysAgo | today |
| `12mo` | 365daysAgo | today |
| `custom` | startDate 參數 | endDate 參數 |

## Filter 策略

同 Plausible，用扁平參數讓 AI 容易使用，client 層轉換為 GA4 dimensionFilter：

- `page` → `pagePath` stringFilter (CONTAINS)
- `source` → `sessionSource` stringFilter (EXACT)
- `country` → `country` stringFilter (EXACT)
- `device` → `deviceCategory` stringFilter (EXACT)
- `event` → `eventName` stringFilter (EXACT)

## Configuration

| 環境變數 | 必填 | 說明 |
|---------|------|------|
| `GA4_CLIENT_EMAIL` | Yes | Service Account email |
| `GA4_PRIVATE_KEY` | Yes | Service Account private key（PEM） |
| `GA4_PROPERTY_ID` | Yes | GA4 Property ID（純數字） |

## Decisions

1. **使用 `@google-analytics/data` 套件**：GA4 API 的認證和 request 格式較複雜，官方套件處理得好。不同於 Plausible 用 fetch。
2. **credentials 物件認證**：不需要 JSON 檔案路徑，直接用 `client_email` + `private_key` 環境變數，部署更簡單。
3. **Metrics 固定 6 個核心**：同 Plausible 策略，不讓 AI 選擇 metrics，避免遺漏。
4. **Dimension 名稱簡化**：AI 用短名（source, page, country），client 層映射到 GA4 API 名稱（sessionSource, pagePath, country）。
5. **private_key 換行處理**：環境變數中的 `\n` 需轉換為實際換行，在 client 層處理。
