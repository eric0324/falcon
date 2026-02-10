# Meta Ads Read Integration

## ADDED Requirements

### Requirement: Meta Ads Configuration Check
The system SHALL detect whether Meta Ads is configured.

#### Scenario: Access token and account ID configured
- **Given** `META_ADS_ACCESS_TOKEN` and `META_ADS_ACCOUNT_ID` are set
- **When** the system checks Meta Ads status
- **Then** it returns `configured: true`

#### Scenario: Credentials not configured
- **Given** `META_ADS_ACCESS_TOKEN` is not set
- **When** the system checks Meta Ads status
- **Then** it returns `configured: false`

---

### Requirement: Account Overview
The system SHALL let the AI query account-level ad performance metrics.

#### Scenario: Get account overview for last 7 days
- **Given** Meta Ads is configured
- **When** the AI calls `metaAdsQuery({ action: "overview", dateRange: "last_7d" })`
- **Then** it returns `{ spend, impressions, clicks, ctr, cpc, cpm, reach, frequency, actions }` for the account

#### Scenario: Get overview with custom date range
- **Given** Meta Ads is configured
- **When** the AI calls `metaAdsQuery({ action: "overview", dateRange: "custom", startDate: "2026-01-01", endDate: "2026-01-31" })`
- **Then** it returns account metrics for the specified date range

#### Scenario: Meta Ads not configured
- **Given** Meta Ads is not configured
- **When** the AI calls `metaAdsQuery({ action: "overview" })`
- **Then** it returns `{ success: false, needsConnection: true }`

---

### Requirement: Campaign Performance
The system SHALL let the AI query performance data at the campaign level.

#### Scenario: List campaign performance for last 30 days
- **Given** Meta Ads is configured and has active campaigns
- **When** the AI calls `metaAdsQuery({ action: "campaigns", dateRange: "last_30d" })`
- **Then** it returns an array of `[{ campaignName, campaignId, status, spend, impressions, clicks, ctr, cpc, actions }]` sorted by spend descending

#### Scenario: Campaign performance with limit
- **Given** Meta Ads is configured
- **When** the AI calls `metaAdsQuery({ action: "campaigns", dateRange: "last_7d", limit: 5 })`
- **Then** it returns at most 5 campaigns

---

### Requirement: Timeseries Query
The system SHALL let the AI query ad metrics over time to see trends.

#### Scenario: Daily timeseries for last 30 days
- **Given** Meta Ads is configured
- **When** the AI calls `metaAdsQuery({ action: "timeseries", dateRange: "last_30d", period: "day" })`
- **Then** it returns an array of `[{ date, spend, impressions, clicks }]` with one entry per day

#### Scenario: Default period is daily
- **Given** Meta Ads is configured
- **When** the AI calls `metaAdsQuery({ action: "timeseries", dateRange: "last_7d" })` without specifying period
- **Then** it defaults to daily granularity

---

### Requirement: Breakdown Query
The system SHALL let the AI break down ad metrics by a dimension.

#### Scenario: Breakdown by age
- **Given** Meta Ads is configured
- **When** the AI calls `metaAdsQuery({ action: "breakdown", dimension: "age", dateRange: "last_7d" })`
- **Then** it returns `[{ dimension: "25-34", spend, impressions, clicks, ctr }, ...]` sorted by spend descending

#### Scenario: Breakdown by country
- **Given** Meta Ads is configured
- **When** the AI calls `metaAdsQuery({ action: "breakdown", dimension: "country", dateRange: "last_30d" })`
- **Then** it returns `[{ dimension: "TW", spend, impressions, clicks, ctr }, ...]`

#### Scenario: Breakdown by platform
- **Given** Meta Ads is configured
- **When** the AI calls `metaAdsQuery({ action: "breakdown", dimension: "platform", dateRange: "last_7d" })`
- **Then** it returns `[{ dimension: "facebook", spend, impressions, clicks, ctr }, ...]`

#### Scenario: Breakdown by device
- **Given** Meta Ads is configured
- **When** the AI calls `metaAdsQuery({ action: "breakdown", dimension: "device", dateRange: "last_7d" })`
- **Then** it returns `[{ dimension: "mobile", spend, impressions, clicks, ctr }, ...]`

---

### Requirement: Data Source Selector Integration
The system SHALL display a Meta Ads option in the "Website Analytics" sub-menu.

#### Scenario: Meta Ads appears in selector
- **Given** Meta Ads is configured
- **When** the user opens the data source selector
- **Then** Meta Ads appears in the "Website Analytics" sub-menu and can be selected

#### Scenario: Meta Ads not configured in selector
- **Given** Meta Ads is not configured
- **When** the user opens the data source selector
- **Then** Meta Ads appears with "Not configured" status and cannot be selected

---

### Requirement: Chat Route Tool Registration
The system SHALL dynamically load Meta Ads tools based on data source selection.

#### Scenario: Meta Ads selected as data source
- **Given** the user selected Meta Ads as a data source
- **When** a chat message is sent
- **Then** the chat route includes metaAdsTools in the available tools

#### Scenario: Meta Ads not selected
- **Given** the user did not select Meta Ads
- **When** a chat message is sent
- **Then** metaAdsTools is not included

---

### Requirement: System Prompt Meta Ads Guide
The system SHALL include a Meta Ads usage guide in the system prompt when Meta Ads is selected.

#### Scenario: Meta Ads guide in system prompt
- **Given** the user selected Meta Ads as a data source
- **When** the system prompt is built
- **Then** it includes Meta Ads tool usage instructions, available actions, dimension options, and date range options
