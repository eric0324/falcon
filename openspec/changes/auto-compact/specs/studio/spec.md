# Studio Spec Deltas — auto-compact

## ADDED Requirements

### Requirement: Auto Compact
The system SHALL automatically compact conversation history when approaching the AI model's context window limit, preserving recent messages and summarizing older ones.

#### Scenario: Short conversation (no compact)
- GIVEN a conversation with estimated tokens below 80% of the model's context window
- WHEN a user sends a message
- THEN all messages are sent to the AI as-is
- AND no compact event is emitted

#### Scenario: Long conversation triggers compact
- GIVEN a conversation with estimated tokens at or above 80% of the model's context window
- WHEN a user sends a message
- THEN the system summarizes older messages using a fast model (claude-haiku)
- AND keeps the most recent 6 messages intact
- AND sends [summary + recent messages] to the AI instead of full history
- AND emits a compact stream event to the frontend

#### Scenario: Compact preserves context
- GIVEN a conversation has been compacted
- WHEN the AI receives the compacted messages
- THEN the AI can correctly reference key decisions and requirements from the summarized portion
- AND the AI responds coherently based on the full context

#### Scenario: Compact indicator displayed
- GIVEN a compact event is received by the frontend
- WHEN the chat messages are rendered
- THEN a compact indicator is displayed between the compacted and recent messages
- AND the indicator shows how many messages were kept

#### Scenario: Summary persisted to database
- GIVEN a compact has been triggered
- WHEN the summary is generated
- THEN the summary is saved to the Conversation record in the database
- AND subsequent requests for the same conversation can reuse the stored summary

#### Scenario: Resume compacted conversation
- GIVEN a conversation with a stored summary
- WHEN the user reloads or navigates back to the conversation
- AND the conversation still exceeds the compact threshold
- THEN the stored summary is used instead of re-generating
- AND the user sees the full message history in the UI

## MODIFIED Requirements

### Requirement: Conversation History
The system SHALL maintain conversation context within a session, with automatic compaction for long conversations.

#### Scenario: Continue conversation
- WHEN a user sends follow-up messages
- THEN previous messages are included in the AI context
- AND if the conversation exceeds the compact threshold, older messages are replaced by a summary
- AND the AI can reference earlier requirements via the summary
