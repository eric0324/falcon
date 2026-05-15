# Studio Spec Deltas — split-system-prompt-cache-segments

## ADDED Requirements

### Requirement: Layered System Prompt Segmentation
The system SHALL build the system prompt as three ordered segments — Core, Capabilities, Volatile — sorted by stability (most stable first), so that prefix-based prompt caches across all supported providers can hit the longest common stable prefix.

#### Scenario: Three-segment construction
- WHEN the chat API constructs the system prompt for a request
- THEN it produces three segments in this exact order:
  - Core: `BASE_PROMPT` + always-on bridge sections (`LLM_BRIDGE` / `SCRAPER_BRIDGE` / `TOOLDB`)
  - Capabilities: dataSource-specific instructions + `companyAPI` instructions + image bridge sections (only when image generation is enabled) + suggestDataSources instructions
  - Volatile: `Current Time` + memory recall + skill prompt + current tool code + large-tool notice
- AND each segment may be empty string except Core (which is always non-empty)

#### Scenario: Current Time lives in Volatile
- GIVEN the system prompt is built at any time T
- WHEN comparing the Core segment of two builds 60 seconds apart with identical inputs
- THEN the Core segment is byte-identical between the two builds
- AND the difference appears only inside the Volatile segment

#### Scenario: Capabilities stable for identical dataSources
- GIVEN two builds with identical `dataSources`, `availableSources`, `imageGenerationEnabled`
- WHEN constructing the system prompt
- THEN the Capabilities segment is byte-identical between the two builds

#### Scenario: Backward-compatible string accessor
- GIVEN existing callers expecting a string from `buildSystemPrompt(...)`
- WHEN they call the legacy signature
- THEN it returns Core + Capabilities + Volatile concatenated in order
- AND the returned string is semantically equivalent to the pre-change output (no missing or reordered instructions visible to the model)

### Requirement: Multi-Breakpoint Cache Control for Anthropic
The system SHALL emit multiple `cache_control` breakpoints in the system prompt for Anthropic models, one per stable segment, so that volatile changes do not invalidate the cache of stable content.

#### Scenario: Anthropic receives multi-block system content
- GIVEN the selected model is an Anthropic model (claude-opus-47 / claude-opus / claude-sonnet / claude-haiku)
- WHEN the chat API calls `streamText`
- THEN the `system` field is a SystemModelMessage whose `content` is an array of TextPart in order [Core, Capabilities, Volatile]
- AND the Core TextPart has `providerOptions.anthropic.cacheControl.type = "ephemeral"`
- AND the Capabilities TextPart has `providerOptions.anthropic.cacheControl.type = "ephemeral"`
- AND the Volatile TextPart does NOT carry `providerOptions.anthropic.cacheControl`
- AND the tools array continues to mark the last tool with `cache_control: ephemeral` (unchanged from prior change)

#### Scenario: Cache hit on Capabilities after Volatile changes
- GIVEN a conversation made an Anthropic call within the last 5 minutes
- AND the second call has identical Core and Capabilities segments but different Volatile (e.g., new user message, time advanced)
- WHEN the second call is made
- THEN `cache_read_input_tokens` is at least the token count of Core + Capabilities
- AND `cache_creation_input_tokens` covers only the Volatile delta (if any new cache writes occur)

#### Scenario: Cache miss only on Core when Capabilities change
- GIVEN a conversation made an Anthropic call with one dataSource selection
- AND the second call switches to a different dataSource (Capabilities changes, Core stays identical)
- WHEN the second call is made within the cache window
- THEN `cache_read_input_tokens` is at least the token count of Core
- AND Capabilities cache is rewritten (counted in `cache_creation_input_tokens`)

#### Scenario: Empty Capabilities segment produces no empty TextPart
- GIVEN a request with no selected dataSources and `imageGenerationEnabled = false`
- WHEN building the Anthropic system content
- THEN no zero-length TextPart is emitted
- AND the array contains only the non-empty segments (Core, and possibly Volatile)

### Requirement: Provider-Specific Caching Strategy
The system SHALL apply provider-appropriate caching semantics based on the selected model's provider.

#### Scenario: OpenAI receives concatenated string
- GIVEN the selected model is gpt-5-mini / gpt-5-nano / any OpenAI model
- WHEN the chat API constructs `streamText` input
- THEN the `system` field is a single string equal to Core + Capabilities + Volatile concatenated
- AND no `providerOptions.anthropic` is attached anywhere
- AND the stable prefix (Core + Capabilities) is the first contiguous bytes of the string, enabling OpenAI prefix cache to match on subsequent turns

#### Scenario: Gemini receives concatenated string
- GIVEN the selected model is gemini-flash / gemini-pro / any Google model
- WHEN the chat API constructs `streamText` input
- THEN the `system` field is a single string in the same order [Core, Capabilities, Volatile]
- AND the request succeeds without provider errors
- AND any implicit context cache discount captured via `inputTokenDetails` is recorded by usage accounting (unchanged behavior from prior change)

## MODIFIED Requirements

### Requirement: Prompt Caching for Anthropic Models
The system SHALL mark stable portions of the system prompt and the tool definitions as cacheable when calling Anthropic models, using multiple `cache_control` breakpoints aligned with the layered segmentation defined in this spec.

#### Scenario: Cache breakpoints align with segmentation
- GIVEN the selected model is an Anthropic model
- WHEN `streamText` is invoked
- THEN exactly three `cache_control: ephemeral` markers are present in the request:
  - one on the Core TextPart of the system message
  - one on the Capabilities TextPart of the system message
  - one on the last tool definition
- AND the count fits within Anthropic's 4-breakpoint limit with one breakpoint of headroom

#### Scenario: Non-Anthropic model skips cacheControl marking
- GIVEN the selected model is gpt-5-mini / gpt-5-nano / gemini-flash / gemini-pro
- WHEN the chat API calls `streamText`
- THEN no `providerOptions.anthropic` is attached on system or tools
- AND the request is sent normally without provider errors

#### Scenario: Empty tools does not error
- GIVEN the compact fallback path uses `tools: {}`
- WHEN `cacheableTools` is applied to an empty object
- THEN no cacheControl is attached
- AND the request proceeds without errors

#### Scenario: Usage log includes segment-level token estimates
- WHEN a chat request completes
- THEN the server log records, in addition to existing `inputTokens / outputTokens / cacheReadTokens / cacheCreationTokens`, an estimate `segmentTokens = { core, capabilities, volatile }` for observability
