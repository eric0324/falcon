# Studio Spec Delta: link-token-usage-to-message

## MODIFIED Requirements

### Requirement: Token Usage Tracking (was: implicit in Chat Interface)

The system SHALL record token usage per assistant message, not just per conversation.

#### Scenario: Record token usage for assistant message
- **Given** user sends a message and AI responds
- **When** the conversation is saved (POST or PATCH `/api/conversations`)
- **Then** the `TokenUsage` record is linked to the specific `ConversationMessage` via `conversationMessageId`
- **And** `TokenUsage.model` records which model generated that message

#### Scenario: Multi-step tool call token usage
- **Given** an AI response involves multiple tool call steps
- **When** token usage is aggregated across steps
- **Then** a single `TokenUsage` record is created with the total input/output tokens
- **And** it is linked to the final assistant message of that turn

#### Scenario: View message-level token usage
- **Given** a conversation is loaded (GET `/api/conversations/:id`)
- **When** messages are returned
- **Then** each assistant message includes optional `tokenUsage` with `model`, `inputTokens`, `outputTokens`

#### Scenario: TokenUsage no longer links to Conversation directly
- **Given** a `TokenUsage` record is created
- **When** it is linked to a `ConversationMessage`
- **Then** the `Conversation` is derived via `ConversationMessage.conversationId`
- **And** `TokenUsage` SHALL NOT have a direct `conversationId` column

### Requirement: Conversation Message Schema

ConversationMessage MUST NOT store `model` directly; model information SHALL be derived from the linked TokenUsage.

#### Scenario: Save conversation message without model
- **Given** a conversation is created or updated
- **When** messages are persisted to `ConversationMessage`
- **Then** the `model` column does not exist on `ConversationMessage`
- **And** model info is available via the related `TokenUsage` record

## REMOVED Requirements

### Requirement: ConversationMessage.model field
- The `model` column on `ConversationMessage` is removed.
- Model information is tracked exclusively via `TokenUsage.model`.

### Requirement: TokenUsage.conversationId field
- The `conversationId` column on `TokenUsage` is removed.
- Conversation association is derived through `ConversationMessage.conversationId`.
