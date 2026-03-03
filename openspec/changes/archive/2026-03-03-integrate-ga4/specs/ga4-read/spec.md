# GA4 Analytics Read Integration

## ADDED Requirements

### Requirement: GA4 Configuration Check
The system SHALL detect whether Google Analytics 4 is configured.

#### Scenario: Service account and property ID configured
- **Given** `GA4_CLIENT_EMAIL`, `GA4_PRIVATE_KEY`, and `GA4_PROPERTY_ID` are set
- **When** the system checks GA4 status
- **Then** it returns `configured: true`

#### Scenario: Credentials not configured
- **Given** `GA4_CLIENT_EMAIL` is not set
- **When** the system checks GA4 status
- **Then** it returns `configured: false`

---

### Requirement: Realtime Users
The system SHALL let the AI query the current number of active users.

#### Scenario: Get realtime active users
- **Given** GA4 is configured
- **When** the AI calls `ga4Query({ action: "realtime" })`
- **Then** it returns `{ activeUsers: <number> }` representing users in the last 30 minutes

#### Scenario: GA4 not configured
- **Given** GA4 is not configured
- **When** the AI calls `ga4Query({ action: "realtime" })`
- **Then** it returns `{ success: false, needsConnection: true }`

---

### Requirement: Aggregate Metrics
The system SHALL let the AI query aggregate metrics for a date range.

#### Scenario: Get aggregate metrics for 30 days
- **Given** GA4 is configured and has data
- **When** the AI calls `ga4Query({ action: "aggregate", dateRange: "30d" })`
- **Then** it returns `{ activeUsers, screenPageViews, sessions, bounceRate, averageSessionDuration, sessionsPerUser }`

#### Scenario: Get aggregate with page filter
- **Given** GA4 is configured
- **When** the AI calls `ga4Query({ action: "aggregate", dateRange: "7d", page: "/blog" })`
- **Then** it returns aggregate metrics filtered to pages containing `/blog`

#### Scenario: Get aggregate with custom date range
- **Given** GA4 is configured
- **When** the AI calls `ga4Query({ action: "aggregate", dateRange: "custom", startDate: "2026-01-01", endDate: "2026-01-31" })`
- **Then** it returns aggregate metrics for the specified date range

---

### Requirement: Timeseries Query
The system SHALL let the AI query metrics over time to see trends.

#### Scenario: Daily timeseries for 30 days
- **Given** GA4 is configured
- **When** the AI calls `ga4Query({ action: "timeseries", dateRange: "30d", period: "day" })`
- **Then** it returns an array of `[{ date, activeUsers, screenPageViews }]` with one entry per day

#### Scenario: Monthly timeseries for 12 months
- **Given** GA4 is configured
- **When** the AI calls `ga4Query({ action: "timeseries", dateRange: "12mo", period: "month" })`
- **Then** it returns an array with one entry per month

---

### Requirement: Breakdown Query
The system SHALL let the AI break down metrics by a dimension.

#### Scenario: Breakdown by traffic source
- **Given** GA4 is configured
- **When** the AI calls `ga4Query({ action: "breakdown", dimension: "source", dateRange: "7d" })`
- **Then** it returns `[{ dimension: "google", activeUsers, screenPageViews }, ...]` sorted by activeUsers descending

#### Scenario: Breakdown by page
- **Given** GA4 is configured
- **When** the AI calls `ga4Query({ action: "breakdown", dimension: "page", dateRange: "30d" })`
- **Then** it returns `[{ dimension: "/pricing", activeUsers, screenPageViews }, ...]`

#### Scenario: Breakdown by country
- **Given** GA4 is configured
- **When** the AI calls `ga4Query({ action: "breakdown", dimension: "country", dateRange: "30d" })`
- **Then** it returns `[{ dimension: "Taiwan", activeUsers, screenPageViews }, ...]`

#### Scenario: Breakdown by device
- **Given** GA4 is configured
- **When** the AI calls `ga4Query({ action: "breakdown", dimension: "device", dateRange: "7d" })`
- **Then** it returns `[{ dimension: "mobile", activeUsers, screenPageViews }, ...]`

#### Scenario: Breakdown with filter
- **Given** GA4 is configured
- **When** the AI calls `ga4Query({ action: "breakdown", dimension: "page", dateRange: "7d", source: "google" })`
- **Then** it returns page breakdown filtered to traffic from Google only

---

### Requirement: Data Source Selector Integration
The system SHALL display a GA4 option in the "Website Analytics" sub-menu.

#### Scenario: GA4 appears in selector
- **Given** GA4 is configured
- **When** the user opens the data source selector
- **Then** GA4 appears in the "Website Analytics" sub-menu and can be selected

#### Scenario: GA4 not configured in selector
- **Given** GA4 is not configured
- **When** the user opens the data source selector
- **Then** GA4 appears with "Not configured" status and cannot be selected

---

### Requirement: Chat Route Tool Registration
The system SHALL dynamically load GA4 tools based on data source selection.

#### Scenario: GA4 selected as data source
- **Given** the user selected GA4 as a data source
- **When** a chat message is sent
- **Then** the chat route includes ga4Tools in the available tools

#### Scenario: GA4 not selected
- **Given** the user did not select GA4
- **When** a chat message is sent
- **Then** ga4Tools is not included

---

### Requirement: System Prompt GA4 Guide
The system SHALL include a GA4 usage guide in the system prompt when GA4 is selected.

#### Scenario: GA4 guide in system prompt
- **Given** the user selected GA4 as a data source
- **When** the system prompt is built
- **Then** it includes GA4 tool usage instructions, available actions, dimension options, and date range options
