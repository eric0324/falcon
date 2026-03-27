# Studio Spec Delta — Server-Side History Loading

## MODIFIED Requirements

### Requirement: Chat Interface
The system SHALL send only the new user message and conversation identifier to the chat API, and the server SHALL load conversation history from the database.

#### Scenario: Send message with existing conversation
- GIVEN a conversation with `conversationId` exists in the database
- WHEN a user sends a new message
- THEN the client sends only the new message text and `conversationId` to the chat API
- AND the server loads conversation history from the database
- AND the server appends the user message and AI response to the database after streaming completes

#### Scenario: Send message for new conversation
- GIVEN no `conversationId` exists yet
- WHEN a user sends the first message
- THEN the client sends the message text without `conversationId`
- AND the server creates a new conversation in the database
- AND the server appends the user message and AI response after streaming completes
- AND the server returns the new `conversationId` to the client

#### Scenario: Message with file attachments
- GIVEN a user attaches files to a message
- WHEN the message is sent
- THEN the files are included in the request body alongside the message text
- AND the total request size stays well under the Nginx body size limit (5MB)

### Requirement: Conversation History
The server SHALL persist new messages (user + assistant) to the database after each exchange, and load history from the database for subsequent requests.

#### Scenario: Continue conversation
- WHEN a user sends follow-up messages
- THEN the server loads all previous messages from the database
- AND applies compaction/trimming as needed
- AND all previous messages are included in the AI context

#### Scenario: Save conversation
- WHEN the AI finishes responding
- THEN the server directly writes the new messages (user + assistant) to the database
- AND the client does not need to separately call the conversations API to save
