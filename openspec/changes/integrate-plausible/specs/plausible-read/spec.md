# Plausible Analytics Read Integration

## ADDED Requirements

### Requirement: Plausible Configuration Check
The system SHALL detect whether Plausible Analytics is configured.

#### Scenario: API key and site ID configured
- **Given** `PLAUSIBLE_API_KEY` and `PLAUSIBLE_SITE_ID` are set
- **When** the system checks Plausible status
- **Then** it returns `configured: true`

#### Scenario: API key not configured
- **Given** `PLAUSIBLE_API_KEY` is not set
- **When** the system checks Plausible status
- **Then** it returns `configured: false`

---

### Requirement: Realtime Visitors
The system SHALL let the AI query the current number of visitors on the site.

#### Scenario: Get realtime visitors
- **Given** Plausible is configured
- **When** the AI calls `plausibleQuery({ action: "realtime" })`
- **Then** it returns `{ visitors: <number> }` representing visitors in the last 5 minutes

#### Scenario: Plausible not configured
- **Given** Plausible is not configured
- **When** the AI calls `plausibleQuery({ action: "realtime" })`
- **Then** it returns `{ success: false, needsConnection: true }`

---

### Requirement: Aggregate Metrics
The system SHALL let the AI query aggregate metrics for a date range.

#### Scenario: Get aggregate metrics for 30 days
- **Given** Plausible is configured and has data
- **When** the AI calls `plausibleQuery({ action: "aggregate", dateRange: "30d" })`
- **Then** it returns `{ visitors, pageviews, visits, bounceRate, visitDuration, viewsPerVisit }`

#### Scenario: Get aggregate with page filter
- **Given** Plausible is configured
- **When** the AI calls `plausibleQuery({ action: "aggregate", dateRange: "7d", page: "/blog" })`
- **Then** it returns aggregate metrics filtered to pages matching `/blog`

#### Scenario: Get aggregate with custom date range
- **Given** Plausible is configured
- **When** the AI calls `plausibleQuery({ action: "aggregate", dateRange: "custom", startDate: "2026-01-01", endDate: "2026-01-31" })`
- **Then** it returns aggregate metrics for the specified date range

---

### Requirement: Timeseries Query
The system SHALL let the AI query metrics over time to see trends.

#### Scenario: Daily timeseries for 30 days
- **Given** Plausible is configured
- **When** the AI calls `plausibleQuery({ action: "timeseries", dateRange: "30d", period: "day" })`
- **Then** it returns an array of `[{ date, visitors, pageviews }]` with one entry per day

#### Scenario: Monthly timeseries for 12 months
- **Given** Plausible is configured
- **When** the AI calls `plausibleQuery({ action: "timeseries", dateRange: "12mo", period: "month" })`
- **Then** it returns an array with one entry per month

---

### Requirement: Breakdown Query
The system SHALL let the AI break down metrics by a dimension (source, page, country, device, etc.).

#### Scenario: Breakdown by traffic source
- **Given** Plausible is configured
- **When** the AI calls `plausibleQuery({ action: "breakdown", dimension: "source", dateRange: "7d" })`
- **Then** it returns `[{ dimension: "Google", visitors, pageviews }, ...]` sorted by visitors descending

#### Scenario: Breakdown by page
- **Given** Plausible is configured
- **When** the AI calls `plausibleQuery({ action: "breakdown", dimension: "page", dateRange: "30d" })`
- **Then** it returns `[{ dimension: "/pricing", visitors, pageviews }, ...]`

#### Scenario: Breakdown by country
- **Given** Plausible is configured
- **When** the AI calls `plausibleQuery({ action: "breakdown", dimension: "country", dateRange: "30d" })`
- **Then** it returns `[{ dimension: "Taiwan", visitors, pageviews }, ...]` using human-readable country names

#### Scenario: Breakdown by device
- **Given** Plausible is configured
- **When** the AI calls `plausibleQuery({ action: "breakdown", dimension: "device", dateRange: "7d" })`
- **Then** it returns `[{ dimension: "Mobile", visitors, pageviews }, ...]`

#### Scenario: Breakdown by UTM source
- **Given** Plausible is configured
- **When** the AI calls `plausibleQuery({ action: "breakdown", dimension: "utm_source", dateRange: "7d" })`
- **Then** it returns `[{ dimension: "facebook", visitors, pageviews }, ...]`

#### Scenario: Breakdown with filter
- **Given** Plausible is configured
- **When** the AI calls `plausibleQuery({ action: "breakdown", dimension: "page", dateRange: "7d", source: "Google" })`
- **Then** it returns page breakdown filtered to traffic from Google only

---

### Requirement: Data Source Selector Integration
The system SHALL display a Plausible option in the data source selector.

#### Scenario: Plausible appears in selector
- **Given** Plausible is configured
- **When** the user opens the data source selector
- **Then** Plausible appears in the third-party services sub-menu and can be selected

#### Scenario: Plausible not configured in selector
- **Given** Plausible is not configured
- **When** the user opens the data source selector
- **Then** Plausible appears with "Not configured" status and cannot be selected

---

### Requirement: Chat Route Tool Registration
The system SHALL dynamically load Plausible tools based on data source selection.

#### Scenario: Plausible selected as data source
- **Given** the user selected Plausible as a data source
- **When** a chat message is sent
- **Then** the chat route includes plausibleTools in the available tools

#### Scenario: Plausible not selected
- **Given** the user did not select Plausible
- **When** a chat message is sent
- **Then** plausibleTools is not included

---

### Requirement: System Prompt Plausible Guide
The system SHALL include a Plausible usage guide in the system prompt when Plausible is selected.

#### Scenario: Plausible guide in system prompt
- **Given** the user selected Plausible as a data source
- **When** the system prompt is built
- **Then** it includes Plausible tool usage instructions, available actions, dimension options, and date range options
