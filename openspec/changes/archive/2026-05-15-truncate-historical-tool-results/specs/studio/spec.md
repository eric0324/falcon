# Studio Spec Deltas — truncate-historical-tool-results

## ADDED Requirements

### Requirement: Historical Tool Result Truncation
The chat API SHALL truncate large `tool-result` payloads from older turns before sending the conversation to the LLM, while keeping the most recent turns intact, so that long conversations do not re-send the same large tool outputs on every step of the tool loop.

#### Scenario: Keep most recent turns intact
- GIVEN a conversation has 3 or more user messages
- WHEN the chat API builds the LLM request
- THEN the assistant + tool messages belonging to the last 2 user-message turns retain their `tool-result` payloads byte-identical
- AND only messages older than that boundary are subject to truncation

#### Scenario: Small results are not touched
- GIVEN an older-turn assistant message has a `toolCalls[].result` whose JSON serialization is ≤ 1000 estimated tokens
- WHEN truncation runs
- THEN the result is left unchanged

#### Scenario: Large results are truncated with a clear marker
- GIVEN an older-turn assistant message has a `toolCalls[].result` whose JSON serialization is > 1000 estimated tokens
- WHEN truncation runs
- THEN the result is replaced with a string that begins with `[TRUNCATED]`
- AND contains the first ~1000 tokens worth of the original serialized content
- AND ends with `[truncated: kept first ~N tokens of M total]`
- AND the truncated string is propagated through the existing tool-result path (JSON.stringify in tool-result.output.value)

#### Scenario: Short conversations are not truncated
- GIVEN a conversation has fewer than 2 user messages
- WHEN truncation runs
- THEN all messages are returned unchanged (no truncation possible — keep-window covers the whole history)

#### Scenario: Truncation is non-destructive to storage
- GIVEN truncation has removed bytes from older tool results in the in-memory copy sent to the LLM
- WHEN the conversation is later re-fetched via `getMessages` for UI display, admin pages, or any other consumer
- THEN the original (un-truncated) tool result is still returned from the database
- AND the truncation does not persist to `ConversationMessage.toolCalls`

#### Scenario: Assistant messages without tool calls pass through unchanged
- GIVEN an older-turn assistant message has only text content (no `toolCalls`)
- WHEN truncation runs
- THEN the message is returned identical to the input

#### Scenario: User and tool messages outside the keep-window
- GIVEN truncation iterates over the full message list
- WHEN it encounters older user messages (any text) or assistant text content
- THEN it does NOT modify them — only `toolCalls[].result` is considered for truncation

#### Scenario: Truncation runs before compaction
- GIVEN the chat API needs to both truncate historical tool results and (if oversized) compact the message list
- WHEN building the LLM request
- THEN `truncateHistoricalToolResults` is applied first
- AND `compactMessages` / `trimMessagesToFit` operate on the already-truncated list
- AND the three concerns remain orthogonal: truncate shrinks per-result size; compact summarizes whole older messages; trim is the hard cutoff safety net

#### Scenario: Observability log
- WHEN truncation runs and at least one result was truncated
- THEN the server log records the count of truncated results and an estimate of tokens saved
