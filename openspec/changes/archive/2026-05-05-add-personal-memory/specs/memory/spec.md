# Memory Spec Deltas — add-personal-memory

## ADDED Requirements

### Requirement: Memory Storage Schema
The system SHALL provide a `Memory` data model that stores per-user personal memories with vector embeddings for similarity-based recall.

#### Scenario: Memory belongs to a single user
- GIVEN a user with id `U1` stores a memory
- WHEN the memory is queried by a different user `U2`
- THEN `U2` CANNOT read or modify that memory
- AND deleting user `U1` cascades to delete all their memories

#### Scenario: Memory is classified by type
- GIVEN a memory is stored
- THEN its `type` is one of: `preference`, `context`, `rule`, `fact`
- AND the type is required (non-null)

#### Scenario: Memory tracks source and confidence
- GIVEN a memory stored via explicit keyword trigger
- THEN `source = explicit` and `confidence = high`
- GIVEN a memory stored via accepted suggestion
- THEN `source = suggested` and `confidence = medium`

#### Scenario: Memory has vector embedding
- GIVEN a memory is created or has its content updated
- THEN an embedding is generated via Voyage `voyage-3` (1024-dim)
- AND stored in the `embedding` column
- AND subsequent recall queries can use this embedding

### Requirement: Explicit Memory Extraction
The system SHALL detect user messages containing explicit memory keywords and automatically store them as high-confidence memories.

#### Scenario: Chinese keyword triggers extraction
- GIVEN a user message contains one of: 記起來, 記住, 記下, 以後都, 每次都, 我喜歡, 我討厭, 我在做, 我的部門是, 我的職位是, 我叫
- WHEN the chat API processes the message
- THEN an explicit extraction pass runs
- AND a `Memory` row is created with `source = explicit`, `confidence = high`
- AND the toast "已記住：〔title〕" is emitted in the stream response

#### Scenario: English keyword triggers extraction
- GIVEN a user message contains one of: remember, please remember, always, never, I prefer, I'm working on, I am working on, my department is, my role is
- WHEN the chat API processes the message
- THEN an explicit extraction pass runs
- AND a `Memory` row is created with `source = explicit`, `confidence = high`

#### Scenario: Extraction uses Haiku to structure content
- GIVEN a keyword has matched
- WHEN extraction runs
- THEN a Haiku call extracts structured fields: `title` (<=120 chars), `type`, normalized `content`
- AND raw user message is NOT stored verbatim as content

#### Scenario: No keyword means no explicit extraction
- GIVEN a user message contains none of the trigger keywords
- WHEN the chat API processes the message
- THEN no explicit extraction runs
- AND no Haiku call is made for explicit extraction

#### Scenario: First-time trigger shows onboarding toast
- GIVEN this is the user's first-ever memory stored (Memory count was 0 for this user)
- WHEN an explicit extraction succeeds
- THEN the toast includes a link "到 /memory 管理"
- AND subsequent triggers show only the short "已記住" toast

### Requirement: Passive Memory Suggestion
The system SHALL run a passive extraction pass after each assistant response to produce suggested memories that the user can review and accept.

#### Scenario: Passive pass runs async after response
- GIVEN the chat API has finished streaming an assistant response
- WHEN the stream ends
- THEN a passive extraction job is enqueued (or fire-and-forget)
- AND the passive pass does NOT block the response to the user

#### Scenario: Passive pass uses Haiku on recent context
- GIVEN a passive extraction job runs
- THEN it calls Haiku with the last 6 messages (3 user + 3 assistant turns) as context
- AND the prompt instructs it to propose at most 3 candidate memories per pass
- AND each candidate has type, title (<=120 chars), content

#### Scenario: Candidates are stored as SuggestedMemory
- GIVEN the passive pass returns candidate memories
- WHEN storing candidates
- THEN they are written to `SuggestedMemory` with `status = pending`
- AND each candidate is linked to the current `conversationId`
- AND the user's Memory table is NOT modified

#### Scenario: Duplicate suggestions are suppressed
- GIVEN a candidate memory is produced
- WHEN its semantic similarity to any existing Memory or SuggestedMemory(status=pending|dismissed) for this user >= 0.9
- THEN the candidate is discarded (not stored)

#### Scenario: User accepts a suggestion
- GIVEN a SuggestedMemory row with status `pending`
- WHEN the user confirms via the side panel
- THEN a Memory row is created with `source = suggested`, `confidence = medium`
- AND the SuggestedMemory row is updated to `status = accepted`
- AND `acceptedMemoryId` references the new Memory

#### Scenario: User dismisses a suggestion
- GIVEN a SuggestedMemory row with status `pending`
- WHEN the user dismisses via the side panel
- THEN the SuggestedMemory row is updated to `status = dismissed`
- AND no Memory row is created
- AND the suggestion is NOT shown again

### Requirement: Memory Recall
The system SHALL recall relevant personal memories for each new user message and inject them into the system prompt within a bounded character budget.

#### Scenario: Recall embeds the user message
- GIVEN a new user message arrives in the chat API
- WHEN recall runs
- THEN the message is embedded via Voyage `voyage-3`

#### Scenario: Recall returns top-K by similarity
- GIVEN the user has stored memories
- WHEN recall queries pgvector
- THEN it retrieves up to 10 candidates ordered by cosine distance ASC (closest first)
- AND filters out candidates with similarity score < 0.65
- AND keeps at most 5 results

#### Scenario: Recall respects character budget
- GIVEN recalled memories' total content length exceeds 2000 characters
- WHEN assembling the prompt snippet
- THEN memories are appended in descending similarity order
- AND appending stops once the budget is exhausted
- AND truncated memories are NOT partially included

#### Scenario: Recalled memories are injected into system prompt
- GIVEN recall returned one or more memories
- WHEN the system prompt is assembled
- THEN a `## Personal Memories (recalled for this message)` section is appended
- AND each memory is formatted as `- [type] content`

#### Scenario: No relevant memories skips injection
- GIVEN the user has no memories, OR all memories score below the similarity threshold
- WHEN the system prompt is assembled
- THEN no memory section is added
- AND no failure or warning is surfaced to the user

### Requirement: Memory Management API
The system SHALL provide API endpoints for the user to list, edit, and delete their own memories.

#### Scenario: GET /api/memory lists memories
- GIVEN an authenticated user
- WHEN they GET `/api/memory`
- THEN the response lists only their own memories
- AND memories are grouped by `type`
- AND each memory includes id, type, title, content, source, confidence, createdAt, updatedAt

#### Scenario: PATCH /api/memory/:id edits content
- GIVEN an authenticated user owns memory `M1`
- WHEN they PATCH `/api/memory/M1` with new `title` and/or `content`
- THEN the memory is updated
- AND if `content` changed, the embedding is regenerated
- AND `updatedAt` is set to now

#### Scenario: DELETE /api/memory/:id removes memory
- GIVEN an authenticated user owns memory `M1`
- WHEN they DELETE `/api/memory/M1`
- THEN the memory is removed
- AND subsequent recalls do not return it

#### Scenario: User cannot access another user's memory
- GIVEN authenticated user `U1` and memory `M2` belongs to `U2`
- WHEN `U1` PATCHes or DELETEs `/api/memory/M2`
- THEN the response is 404 (not 403, to avoid leaking existence)

### Requirement: Suggested Memory API
The system SHALL expose endpoints to list and act on pending suggestions.

#### Scenario: GET /api/memory/suggested lists pending suggestions
- GIVEN an authenticated user
- WHEN they GET `/api/memory/suggested`
- THEN the response lists only their `SuggestedMemory` rows where `status = pending`
- AND optionally filtered by `conversationId` query param

#### Scenario: POST /api/memory/suggested/:id/accept accepts a suggestion
- GIVEN a pending SuggestedMemory `S1` belonging to the authenticated user
- WHEN they POST `/api/memory/suggested/S1/accept`
- THEN a Memory is created with `source = suggested`, `confidence = medium`
- AND `S1.status` becomes `accepted`
- AND the response returns the new Memory

#### Scenario: POST /api/memory/suggested/:id/dismiss dismisses a suggestion
- GIVEN a pending SuggestedMemory `S1`
- WHEN they POST `/api/memory/suggested/S1/dismiss`
- THEN `S1.status` becomes `dismissed`
- AND no Memory is created
