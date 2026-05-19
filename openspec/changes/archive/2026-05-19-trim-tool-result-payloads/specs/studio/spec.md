# Studio Spec Deltas — trim-tool-result-payloads

## ADDED Requirements

### Requirement: Tool Result Payload Trimming
The chat tool path SHALL trim redundant or oversized fields from selected Google connector results before returning them to the LLM, so the same payload does not get re-sent on every multi-step tool loop step. The trimming is applied at the chat tool layer only — the API Bridge path (`window.companyAPI` used by deployed tools at runtime) continues to return the full payload unchanged for backward compatibility.

#### Scenario: Sheets read drops the redundant raw field
- GIVEN the AI invokes `googleSearch` for sheets read (or list of a specific sheet range) and the connector returns `{ headers, rows, raw }`
- WHEN the chat tool handler returns the result to the LLM
- THEN the returned `data` no longer contains the `raw` key
- AND `headers` and `rows` are preserved unchanged
- AND if the connector data does not include `raw` (some shapes), the data is returned as-is

#### Scenario: Sheets data of other shapes pass through untouched
- GIVEN the connector returns a different shape (e.g., spreadsheet metadata, file list)
- WHEN the chat tool handler processes the result
- THEN no field is removed or modified

#### Scenario: Gmail body is truncated above the cap
- GIVEN the AI invokes `googleSearch` for gmail read and the connector returns `{ ...headers, body }` with `body.length > 5000`
- WHEN the chat tool handler returns the result to the LLM
- THEN `body` is replaced with the first 5000 characters followed by a marker `\n\n[Body truncated: kept first 5000 chars of N total]` where N is the original length
- AND all other fields (from / to / subject / snippet / labels) remain unchanged

#### Scenario: Short Gmail body is not touched
- GIVEN a gmail read result whose body is ≤ 5000 chars
- WHEN trimming runs
- THEN body is returned byte-identical

#### Scenario: Gmail list result has no body
- GIVEN a gmail list result whose data does not contain a `body` field
- WHEN trimming runs
- THEN no field is added or modified

#### Scenario: API Bridge path is not trimmed
- GIVEN a deployed tool calls `window.companyAPI.execute("google_sheets", "read", ...)` or `window.companyAPI.execute("google_gmail", "read", ...)` at runtime
- WHEN the bridge handler in `src/lib/bridge/handlers.ts` returns the connector result
- THEN the result still includes the full `raw` field (for sheets) and full `body` string (for gmail)
- AND no trimming is applied — deployed tools that rely on these fields continue to work

#### Scenario: System prompt no longer advertises raw
- GIVEN the AI system prompt describes available data shapes for Google connectors
- WHEN the prompt is rendered
- THEN the sheets section does not mention `raw: [[...]]` as part of the result shape
- AND it still instructs the model to use `.rows` for the row object array and `.headers` for column names
