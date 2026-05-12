# image-generation Spec Delta: add-image-bridge-capability

新增「Vibe Coding Bridge Capability」與「Bridge Billing」兩個 requirement，鏡射 audio-transcription 的 bridge 接法。

## ADDED Requirements

### Requirement: Vibe Coding Bridge Capability

User-built tools running in the Vibe Coding sandbox SHALL be able to generate or edit images through the api-bridge as a platform capability (always allowed, same treatment as `llm`, `transcribe`, `scrape`).

#### Scenario: Tool calls bridge.image.generate with text prompt

- GIVEN a user-built tool calls `window.companyAPI.execute("image", "generate", { prompt: "a red apple", provider: "imagen", aspectRatio: "1:1" })`
- WHEN the bridge dispatches the action
- THEN the server calls `generateFromText` with the caller's userId
- AND responds with `{ s3Key, presignedUrl, provider }` on success
- AND the s3Key starts with `images/<callerUserId>/`

#### Scenario: Tool calls bridge.image.edit with sourceImageKey

- GIVEN a user-built tool calls `window.companyAPI.execute("image", "edit", { prompt: "make the apple green", sourceImageKey: "images/<userId>/abc.png", provider: "gpt-image" })`
- WHEN the bridge dispatches
- THEN the server calls `generateFromImage` with the source key and the caller's userId
- AND responds with `{ s3Key, presignedUrl, provider }`

#### Scenario: sourceImageKey ownership check

- GIVEN the tool passes a `sourceImageKey` whose path does NOT start with `images/<callerUserId>/`
- WHEN the bridge validates the params
- THEN the bridge returns a 400-style error citing key ownership
- AND no image generation or S3 read is performed

#### Scenario: Missing prompt

- GIVEN the tool calls either action without `prompt`
- WHEN the bridge validates
- THEN it returns a 400-style error stating that `prompt` is required

#### Scenario: edit action missing sourceImageKey

- GIVEN the tool calls `image.edit` without `sourceImageKey`
- WHEN the bridge validates
- THEN it returns a 400-style error stating that `sourceImageKey` is required for `edit`

#### Scenario: Unknown action

- GIVEN the tool calls `image` with action other than `generate` or `edit`
- WHEN the bridge validates
- THEN it returns a 400-style error citing the unknown action

#### Scenario: image is treated as a platform capability

- GIVEN `dataSourceId: "image"` is passed to `/api/bridge`
- WHEN the route checks permissions
- THEN the request is allowed without checking `tool.dataSources` (same treatment as `llm`, `transcribe`, `scrape`)

#### Scenario: Quota-exceeded caller is blocked

- GIVEN the caller's quota status is `"blocked"` at request time
- WHEN the bridge dispatches `image.generate` or `image.edit`
- THEN the bridge returns a 403 with `{ error: "quota_exceeded", quota }`
- AND no image is generated or billed

### Requirement: Bridge Billing

The bridge image handler SHALL record usage in `TokenUsage` so it counts toward the caller's monthly quota, using the unified usage-tracking schema (`kind="image"`, `units = imageCount`).

#### Scenario: Successful bridge image generation writes TokenUsage

- GIVEN `bridge.image.generate` succeeds producing one image with `modelUsed = "imagen-4"`
- WHEN the handler records usage
- THEN a `TokenUsage` row is created with `kind = "image"`, `userId = caller`, `model = "imagen-4"`, `units = 1`
- AND `inputTokens = 0`, `outputTokens = 0`, `totalTokens = 0`
- AND `costUsd = imagePricing["imagen-4"] * 1`

#### Scenario: Failed bridge image call does not bill

- GIVEN `generateFromText` throws (provider error / quota issue / etc.)
- WHEN the handler catches the error
- THEN no `TokenUsage` row is created
- AND the bridge returns a 500-style error carrying the upstream reason

### Requirement: System Prompt Advertises Bridge Image

The Vibe Coding system prompt SHALL include instructions describing `window.companyAPI.execute("image", ...)` whenever image generation is enabled in the current chat session, so the AI agent proactively designs runtime image features into the tools it builds.

#### Scenario: Image enabled — instructions are injected

- GIVEN the user has selected an image provider for the chat session (so `imageGenerationEnabled === true`)
- WHEN the system prompt is assembled
- THEN it contains an `IMAGE_BRIDGE_INSTRUCTIONS` block describing both `generate` and `edit` actions, alongside the existing agent-side `IMAGE_GENERATION_INSTRUCTIONS`

#### Scenario: Image disabled — instructions are omitted

- GIVEN `imageGenerationEnabled === false`
- WHEN the system prompt is assembled
- THEN the bridge image instructions block is NOT included
- AND the AI agent does not propose runtime image features for that session
