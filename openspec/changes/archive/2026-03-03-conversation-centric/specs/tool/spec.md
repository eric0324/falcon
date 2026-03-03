# Tool Spec Deltas — conversation-centric

## MODIFIED Requirements

### Requirement: Tool Creation
The system SHALL allow users to create tools from an existing conversation.

#### Scenario: Create tool from conversation
- GIVEN the user is in an active Studio conversation with generated code
- WHEN the user clicks Deploy
- THEN a Tool is created with a reference to the existing Conversation
- AND no new Conversation is created

#### Scenario: Create tool without conversation
- GIVEN a tool is created via API without a conversationId
- THEN the Tool is created without a conversation reference
- AND this is allowed for backward compatibility
