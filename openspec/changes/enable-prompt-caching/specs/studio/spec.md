# Studio Spec Deltas — enable-prompt-caching

## ADDED Requirements

### Requirement: Prompt Caching for Anthropic Models
The system SHALL mark system prompt and tool definitions as cacheable when calling Anthropic models, to benefit from Anthropic Prompt Caching (5-minute TTL, 0.1x read / 1.25x write pricing).

#### Scenario: Anthropic model receives cache_control
- GIVEN the selected model is claude-opus-47 / claude-opus / claude-sonnet / claude-haiku
- WHEN the chat API calls streamText
- THEN the system prompt is passed as a structured array with `providerOptions.anthropic.cacheControl.type = "ephemeral"`
- AND the last tool definition is marked with the same cacheControl
- AND the request is sent to Anthropic with the proper cache headers

#### Scenario: Cache hit on subsequent turn
- GIVEN a conversation has made at least one Anthropic call in the last 5 minutes with the same system+tools
- WHEN the user sends a follow-up message
- THEN the Anthropic response includes `cache_read_input_tokens > 0`
- AND `cache_read_input_tokens` accounts for the majority of the system+tools token count

#### Scenario: Non-Anthropic model skips cacheControl marking
- GIVEN the selected model is gpt-5-mini / gpt-5-nano / gemini-flash / gemini-pro
- WHEN the chat API calls streamText
- THEN no `providerOptions.anthropic` is attached
- AND the request is sent normally without provider errors
- AND any cache hits returned by the provider are still captured via inputTokenDetails

#### Scenario: Cost accounting reflects per-provider cache discount
- GIVEN a chat call returns `cacheReadTokens = X` and `cacheWriteTokens = Y`
- WHEN estimateCost is calculated
- THEN the discount applied depends on the model's provider:
  - Anthropic: cost includes `X × input_price × 0.1 + Y × input_price × 1.25`
  - OpenAI:    cost includes `X × input_price × 0.5` (Y ignored)
  - Google:    cost includes `X × input_price × 0.25` (Y ignored)
- AND the per-conversation usage log records the breakdown

#### Scenario: Empty tools does not error
- GIVEN the final compact fallback call uses `tools: {}`
- WHEN cacheableTools is applied to an empty object
- THEN no cacheControl is attached
- AND the request proceeds without errors

## MODIFIED Requirements

### Requirement: Chat API Token Usage
The system SHALL report token usage per chat request including cached-input breakdown for Anthropic models.

#### Scenario: Usage log includes cache stats
- WHEN a chat request completes
- THEN the server log records inputTokens, outputTokens, cachedReadTokens, cacheCreationTokens
- AND the user's quota deduction uses the discounted cost formula
