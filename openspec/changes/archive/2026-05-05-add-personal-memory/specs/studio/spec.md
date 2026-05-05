# Studio Spec Deltas — add-personal-memory

## ADDED Requirements

### Requirement: Chat API Integrates Personal Memory
The chat API SHALL integrate personal memory extraction and recall into the request lifecycle.

#### Scenario: Recall runs before model call
- GIVEN a user sends a message in chat
- WHEN the chat API handler runs
- THEN `recallMemories(userMessage, userId)` runs before assembling the final system prompt
- AND recalled memories are injected into the system prompt

#### Scenario: Explicit extraction runs synchronously with user message
- GIVEN a user message contains an explicit memory keyword
- WHEN the chat API handler runs
- THEN explicit extraction runs BEFORE or IN PARALLEL with the model call (implementation choice)
- AND if a Memory is created, the stream includes an `i:` info event with `{ memoryCreated: { title, type } }`
- AND the client renders a toast based on this event

#### Scenario: Passive extraction runs after response completes
- GIVEN the assistant stream has finished
- WHEN the chat API closes the stream
- THEN a passive extraction job is triggered (async, non-blocking)
- AND the job writes to `SuggestedMemory` with `conversationId` set

#### Scenario: Memory integration does not break existing flows
- GIVEN a user with zero memories
- WHEN they send a chat message
- THEN the chat API behaves identically to pre-change behavior
- AND no extra latency from recall is observable to the user (>100ms)

### Requirement: Chat UI Surfaces Memory Events
The chat UI SHALL surface memory-related events from the chat stream and provide a side panel for pending suggestions.

#### Scenario: Memory toast displays on explicit capture
- GIVEN the stream emits a `memoryCreated` info event
- WHEN the client processes the event
- THEN a toast "已記住：〔title〕" appears near the assistant message
- AND the toast auto-dismisses after 5 seconds

#### Scenario: First memory toast includes management link
- GIVEN this is the user's first-ever memory (server indicates `isFirstMemory: true` in the event)
- WHEN the toast renders
- THEN it includes a link "到 /memory 管理"

#### Scenario: Side panel shows pending suggestions
- GIVEN the current conversation has `SuggestedMemory` rows with `status = pending`
- WHEN the chat page loads
- THEN a collapsible "建議記憶" section appears in the side panel
- AND each suggestion shows `title`, `type`, `content`
- AND each has two buttons: 確認 and 拒絕

#### Scenario: Accept button confirms a suggestion
- GIVEN a pending suggestion is visible
- WHEN the user clicks 確認
- THEN `POST /api/memory/suggested/:id/accept` is called
- AND on success, the suggestion disappears from the side panel
- AND a toast "已加入記憶" appears briefly

#### Scenario: Dismiss button rejects a suggestion
- GIVEN a pending suggestion is visible
- WHEN the user clicks 拒絕
- THEN `POST /api/memory/suggested/:id/dismiss` is called
- AND on success, the suggestion disappears and does not reappear

### Requirement: Memory Management Page
The system SHALL provide `/memory` as the management page for personal memories.

#### Scenario: Page lists memories grouped by type
- GIVEN a user visits `/memory`
- WHEN the page loads
- THEN memories are shown grouped by `type` (preference / context / rule / fact)
- AND each group header shows the count

#### Scenario: Memory can be edited inline
- GIVEN a memory is displayed
- WHEN the user clicks edit
- THEN title and content become editable
- AND save triggers PATCH `/api/memory/:id`
- AND the UI shows the updated memory on success

#### Scenario: Memory can be deleted with confirmation
- GIVEN a memory is displayed
- WHEN the user clicks delete
- THEN a confirmation dialog appears
- AND on confirm, DELETE `/api/memory/:id` is called
- AND the memory is removed from the list

#### Scenario: Empty state guides user
- GIVEN a user has no memories
- WHEN they visit `/memory`
- THEN an empty state shows: "還沒有任何記憶。對話中說『記住...』或『以後都...』就能建立記憶。"
