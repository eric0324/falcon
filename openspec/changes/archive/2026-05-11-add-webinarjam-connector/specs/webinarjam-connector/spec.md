# WebinarJam Connector Spec Deltas — add-webinarjam-connector

## ADDED Requirements

### Requirement: WebinarJam AI Query Tool

The system SHALL provide an AI tool `webinarjamQuery` that reads webinar metadata, schedules, and registrant lists from WebinarJam via its REST API. The tool SHALL be activated in chat only when the user selects `webinarjam` as a data source AND a valid `WEBINARJAM_API_KEY` is configured.

#### Scenario: Tool unavailable when key not configured

- GIVEN `WEBINARJAM_API_KEY` is not set
- WHEN the AI calls `webinarjamQuery` for any action
- THEN the response is `{ success: false, service: "webinarjam", needsConnection: true, error: <message naming the missing key> }`
- AND no network call is made

#### Scenario: List all webinars

- GIVEN `WEBINARJAM_API_KEY` is set
- WHEN the AI calls `webinarjamQuery({ action: "list" })`
- THEN the system POSTs to `https://api.webinarjam.com/webinarjam/webinars` with body `api_key=<key>`
- AND the response contains `data: Array<{ webinar_id, name, description, type, series, schedules, timezone }>`

#### Scenario: Get one webinar's details

- GIVEN a known `webinar_id`
- WHEN the AI calls `webinarjamQuery({ action: "get", webinarId })`
- THEN the system POSTs to `/webinar` with `api_key` and `webinar_id`
- AND the response contains the full webinar object including `schedules: Array<{ date, schedule }>`, `presenters`, `registration_url`, `registration_type`, `registration_fee`

#### Scenario: Get is rejected without webinarId

- GIVEN no `webinarId` is provided
- WHEN the AI calls `webinarjamQuery({ action: "get" })`
- THEN the response is `{ success: false, service: "webinarjam", error: <message stating webinarId is required for the get action> }`
- AND no network call is made

#### Scenario: List registrants for a specific schedule

- GIVEN a webinar's `webinarId` and one of its `scheduleId`
- WHEN the AI calls `webinarjamQuery({ action: "registrants", webinarId, scheduleId })`
- THEN the system POSTs to `/registrants` with `api_key`, `webinar_id`, `schedule_id`
- AND the response data is the raw registrants array as returned by WebinarJam, plus a `page: 1` indicator

#### Scenario: Filter registrants by attendance status

- GIVEN a registrants query with `attendedLive: 2`
- WHEN the request is built
- THEN the body includes `attended_live=2` so WebinarJam returns only registrants who did not attend the live session
- AND values `0..4` map to: 0 = all, 1 = attended live, 2 = did not attend, 3 = attended and left before timestamp, 4 = attended and stayed past timestamp
- AND the same mapping applies to `attendedReplay`

#### Scenario: Filter registrants by purchase

- GIVEN a registrants query with `purchased: 1`
- WHEN the request is built
- THEN the body includes `purchased=1` so WebinarJam returns only registrants who bought a product
- AND values map: 0 = all, 1 = purchased, 2 = did not purchase

#### Scenario: Combined filters and free-text search

- GIVEN `attendedLive: 1`, `purchased: 0`, `search: "ericsmart"`
- WHEN the request is built
- THEN the body includes all three filter keys
- AND WebinarJam applies the conditions server-side (no client-side filtering)

#### Scenario: Pagination via page parameter

- GIVEN `page: 2`
- WHEN the request is built
- THEN the body includes `page=2`
- AND the AI is told via tool description that `page` starts at 1 and increments to fetch more rows

#### Scenario: Registrants rejected without webinarId or scheduleId

- GIVEN action `registrants` is called without `webinarId` or without `scheduleId`
- WHEN the request reaches the tool
- THEN the response is `{ success: false, service: "webinarjam", error: <message naming the missing parameter> }`
- AND no network call is made

#### Scenario: Filter values are constrained at the schema layer

- GIVEN the AI passes `attendedLive: 9`
- WHEN Zod validates the inputSchema
- THEN the request is rejected before reaching `execute`
- AND the same applies for any value outside the documented ranges (attendedLive/attendedReplay: 0-4, purchased: 0-2)

#### Scenario: WebinarJam returns an error response

- GIVEN WebinarJam responds with HTTP 200 but body `{ status: "error", message: "Invalid webinar id" }`
- WHEN the tool receives the response
- THEN the tool returns `{ success: false, service: "webinarjam", error: "Invalid webinar id" }`
- AND no result data is fabricated

#### Scenario: Network or 429 rate-limit error

- GIVEN WebinarJam returns HTTP 429 (rate limit) or a network failure
- WHEN the tool receives the failure
- THEN the response is `{ success: false, service: "webinarjam", error: <message that includes the status code or network error> }`
- AND the AI is informed so it can retry or back off

#### Scenario: Tool description names each filter's numeric semantics

- GIVEN the AI calls the tool for the first time
- WHEN it inspects the tool's description and inputSchema
- THEN each filter parameter's description enumerates the numeric semantics so the AI does not need external lookup
- AND the description states that `scheduleId` for `registrants` must be obtained from a prior `get` call on the same webinar

### Requirement: WebinarJam As a Selectable Data Source

The system SHALL register `webinarjam` as a first-class data source alongside the existing connectors (notion, slack, asana, plausible, ga4, meta-ads, github, vimeo), so users can select it in the chat data-source selector and admins can configure its API key in the admin settings page.

#### Scenario: Data source appears in chat selector when configured

- GIVEN `WEBINARJAM_API_KEY` is set
- WHEN the user opens the chat page
- THEN the data-source selector includes a "WebinarJam" option
- AND selecting it makes `selectedSources` include `webinarjam` for subsequent chat requests

#### Scenario: Tool registered only when data source is selected

- GIVEN the user has not selected webinarjam in the data-source picker
- WHEN a chat request is made
- THEN `webinarjamQuery` is not included in the model's tool set
- AND no tokens are spent on its tool definition

#### Scenario: API key managed through admin system config

- GIVEN an admin opens the system config page
- WHEN they look for WebinarJam
- THEN there is a `WEBINARJAM_API_KEY` field marked as sensitive
- AND saving it stores the value encrypted, matching the behavior of other connector keys

#### Scenario: Integration status endpoint reports webinarjam

- GIVEN any caller hits `/api/integrations/status`
- WHEN the handler enumerates configured integrations
- THEN the response includes a `webinarjam` boolean reflecting `isWebinarjamConfigured()`
