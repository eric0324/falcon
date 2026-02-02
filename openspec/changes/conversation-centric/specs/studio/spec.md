# Studio Spec Deltas — conversation-centric

## MODIFIED Requirements

### Requirement: Conversation History
The system SHALL automatically persist conversation state to the database.

#### Scenario: Auto-create conversation
- WHEN a user sends their first message in a new Studio session
- AND the AI responds
- THEN a Conversation record is created in the database
- AND the URL updates to `/studio?id={conversationId}`

#### Scenario: Auto-save messages
- WHEN a message exchange (user + assistant) completes in an existing conversation
- THEN the messages are appended to the Conversation record
- AND `updatedAt` is refreshed

#### Scenario: Resume conversation
- WHEN a user navigates to `/studio?id={conversationId}`
- THEN the full conversation is loaded from the database
- AND messages, code, model, and dataSources are restored

#### Scenario: Save conversation
- WHEN a user deploys a tool
- THEN the tool references the existing Conversation
- AND no new Conversation is created

### Requirement: Chat Interface
The system SHALL provide a chat-first interface that supports both general conversation and tool creation.

#### Scenario: Direct entry
- WHEN a user navigates to /studio (without id param)
- THEN a blank chat session starts
- AND no database record is created until the first exchange completes
