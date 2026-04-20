# Studio Spec Deltas — set-chat-max-tokens

## ADDED Requirements

### Requirement: Output Token Cap for Chat
The system SHALL enforce a per-model output token cap on all chat streaming calls to prevent runaway generation.

#### Scenario: Default cap applied per model
- GIVEN a chat request using any supported model
- WHEN streamText is called in the chat API
- THEN `maxOutputTokens` is set via `getDefaultMaxOutputTokens(modelId)`
- AND the value matches `MODEL_MAX_OUTPUT_TOKENS[modelId]`

#### Scenario: Normal answer unaffected
- GIVEN a typical chat answer under 4000 tokens
- WHEN the stream completes
- THEN `finishReason` is `stop`
- AND the behavior is unchanged from current

#### Scenario: Runaway answer truncated
- GIVEN the AI attempts to generate more than the cap allows
- WHEN the output reaches the cap
- THEN the stream emits `finishReason = "length"`
- AND output_tokens usage equals the cap
- AND the response is returned to the user as-is (no retry)

#### Scenario: Fallback stream also capped
- GIVEN the MAX_STEPS tool-call limit is reached and a final no-tools streamText runs
- WHEN the fallback call starts
- THEN it also sets `maxOutputTokens` via `getDefaultMaxOutputTokens()`

#### Scenario: Title generation keeps its own cap
- GIVEN generateConversationTitle is called
- WHEN it invokes generateText
- THEN its existing `maxOutputTokens: 30` is preserved unchanged

#### Scenario: Per-model override is exposed
- WHEN the team needs to raise or lower a model's cap
- THEN editing `MODEL_MAX_OUTPUT_TOKENS[modelId]` is the only change required
- AND no chat API code needs to be touched
