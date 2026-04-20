# Studio Spec Deltas — smart-model-routing

## ADDED Requirements

### Requirement: Smart Model Routing
The system SHALL automatically downgrade the selected model to Haiku for simple queries on Anthropic high-tier models, and restore the selected model when complexity signals are detected.

#### Scenario: Short simple query on Opus downgrades to Haiku
- GIVEN the user selected claude-opus-47 or claude-opus or claude-sonnet
- AND the user's message is under 200 characters
- AND the message has no attachments
- AND the message contains no code/analysis/design keywords
- AND the conversation has no prior tool-call history
- WHEN the chat API routes the model
- THEN the actual model used is claude-haiku
- AND the server log records the downgrade reason
- AND the stream `i:` event includes `actualModel: "claude-haiku"`

#### Scenario: Code-related keyword keeps selected model
- GIVEN the user selected a high-tier Anthropic model
- AND the message contains a code/build/analyze keyword (e.g. "寫一個", "幫我改", "code", "build")
- WHEN the chat API routes the model
- THEN the actual model used is the user-selected model (no downgrade)

#### Scenario: Attachment keeps selected model
- GIVEN the user selected a high-tier Anthropic model
- AND the message has one or more attachments
- WHEN the chat API routes the model
- THEN no downgrade occurs

#### Scenario: Long message keeps selected model
- GIVEN the user message length >= 200 characters
- WHEN the chat API routes the model
- THEN no downgrade occurs

#### Scenario: Conversation with tool history keeps selected model
- GIVEN the current conversation has at least one prior assistant tool-call message
- WHEN the chat API routes the model
- THEN no downgrade occurs
- AND subsequent messages in the conversation also skip routing (sticky escalation)

#### Scenario: User-selected Haiku is never routed
- GIVEN the user selected claude-haiku
- WHEN the chat API routes the model
- THEN the actual model is always claude-haiku (no-op)

#### Scenario: Non-Anthropic models skip routing
- GIVEN the user selected gpt-5-mini or gemini-flash or similar
- WHEN the chat API routes the model
- THEN no routing is applied (first-version scope)

#### Scenario: Frontend shows downgrade badge
- GIVEN a stream `i:` event reports `actualModel !== selectedModel`
- WHEN the assistant message is rendered
- THEN a small badge is shown near the message indicating the auto-downgrade
- AND the tooltip explains the reason and that the next turn is re-evaluated

#### Scenario: Cost attribution matches actual model
- GIVEN a downgrade occurred
- WHEN usage is recorded
- THEN the cost is calculated using the actual model's pricing (haiku)
- AND not the user-selected model's pricing
