# image-generation Spec Delta: add-tool-image-assets

調整 bridge ownership 規則，讓 `image.read` 與 `image.edit` 接受 `tools/<toolId>/...` 開頭的 key，前提是 caller 通過該 tool 的 access check 且 `toolId` 等於 request 帶的 toolId。

## MODIFIED Requirements

### Requirement: Vibe Coding Bridge Capability

User-built tools running in the Vibe Coding sandbox SHALL be able to generate or edit images through the api-bridge as a platform capability (always allowed, same treatment as `llm`, `transcribe`, `scrape`). For actions that take an existing s3Key (`edit`, `read`), the bridge SHALL accept keys belonging to either the caller's personal namespace OR the running tool's asset namespace, as follows:

- `images/<callerUserId>/...` — caller's own image (uploads, prior generations)
- `tools/<toolId>/...` — tool asset, BUT only when:
  1. the request carried `toolId` equal to that `<toolId>`, AND
  2. the caller passes `canUserAccessTool(toolId, callerUserId)`

Any other key shape, or `tools/<X>/...` where `X !== requestToolId`, MUST be rejected with a 400.

#### Scenario: Tool calls bridge.image.generate with text prompt

- GIVEN a user-built tool calls `window.companyAPI.execute("image", "generate", { prompt: "a red apple", provider: "imagen", aspectRatio: "1:1" })`
- WHEN the bridge dispatches the action
- THEN the server calls `generateFromText` with the caller's userId
- AND responds with `{ s3Key, presignedUrl, provider }` on success
- AND the s3Key starts with `images/<callerUserId>/`

#### Scenario: Tool calls bridge.image.edit with personal sourceImageKey

- GIVEN a user-built tool calls `window.companyAPI.execute("image", "edit", { prompt: "make the apple green", sourceImageKey: "images/<callerUserId>/abc.png" })`
- WHEN the bridge dispatches
- THEN the ownership check passes (personal namespace match)
- AND the edit proceeds

#### Scenario: Tool calls bridge.image.edit with tool-asset sourceImageKey

- GIVEN the request carries `toolId: "T1"`
- AND the tool's code calls `image.edit({ sourceImageKey: "tools/T1/images/template.png", prompt: "..." })`
- AND the caller passes `canUserAccessTool("T1", callerUserId)`
- WHEN the bridge validates
- THEN the ownership check passes
- AND the edit proceeds reading the buffer from `tools/T1/images/template.png`

#### Scenario: tool-asset sourceImageKey with mismatching toolId

- GIVEN the request carries `toolId: "T1"`
- AND `sourceImageKey: "tools/T2/images/x.png"`
- WHEN the bridge validates
- THEN it returns a 400-style error citing key/toolId mismatch
- AND no S3 read or generation happens

#### Scenario: tool-asset sourceImageKey, caller has no access

- GIVEN the request carries `toolId: "T1"`
- AND `sourceImageKey: "tools/T1/images/x.png"`
- AND `canUserAccessTool("T1", callerUserId)` returns false (e.g. PRIVATE tool, caller is not author)
- WHEN the bridge validates
- THEN it returns a 400-style error citing key ownership
- AND no S3 read happens

#### Scenario: sourceImageKey ownership check — neither personal nor tool asset

- GIVEN the tool passes a `sourceImageKey` that does not match `images/<callerUserId>/...` and does not match `tools/<requestToolId>/...`
- WHEN the bridge validates the params
- THEN the bridge returns a 400-style error citing key ownership
- AND no image generation or S3 read is performed

#### Scenario: Missing prompt

- GIVEN the tool calls either `generate` or `edit` action without `prompt`
- WHEN the bridge validates
- THEN it returns a 400-style error stating that `prompt` is required

#### Scenario: edit action missing sourceImageKey

- GIVEN the tool calls `image.edit` without `sourceImageKey`
- WHEN the bridge validates
- THEN it returns a 400-style error stating that `sourceImageKey` is required for `edit`

#### Scenario: Unknown action

- GIVEN the tool calls `image` with action other than `generate` / `edit` / `upload` / `read`
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

### Requirement: Vibe Coding Bridge — Image Upload and Read

User-built tools running in the Vibe Coding sandbox SHALL be able to upload images from end-user input and read back stored images via the api-bridge platform capability `image`, using actions `upload` and `read`. The `read` action SHALL accept keys belonging to either the caller's personal namespace OR the running tool's asset namespace under the same rules as `image.edit`.

#### Scenario: Tool calls image.upload with base64 PNG

- GIVEN a user-built tool calls `window.companyAPI.execute("image", "upload", { base64: "<png base64>", mimeType: "image/png" })`
- WHEN the bridge dispatches
- THEN the server decodes the base64, validates size and MIME, and uploads to S3 at `images/<callerUserId>/<uuid>.png`
- AND responds with `{ s3Key, presignedUrl }` where `presignedUrl` expires in 1 hour
- AND no `TokenUsage` row is created

#### Scenario: image.upload accepts png, jpeg, webp only

- GIVEN the tool calls `image.upload` with `mimeType` not in {`image/png`, `image/jpeg`, `image/webp`}
- WHEN the bridge validates
- THEN it returns a 415-style error citing the unsupported MIME

#### Scenario: image.upload rejects files over 10MB

- GIVEN the decoded base64 buffer exceeds 10 MB
- WHEN the bridge validates
- THEN it returns a 413-style error stating the size and 10MB limit
- AND nothing is written to S3

#### Scenario: image.upload always writes to caller's personal namespace

- GIVEN the request carries a `toolId`
- WHEN `image.upload` is dispatched
- THEN the key is still constructed as `images/<callerUserId>/<uuid>.<ext>` (NOT a tool asset)
- AND the caller can later pass that key as `sourceImageKey` for `image.edit`

#### Scenario: image.read accepts personal key

- GIVEN the tool calls `image.read` with `s3Key: "images/<callerUserId>/abc.png"`
- WHEN the bridge validates
- THEN ownership check passes
- AND it returns `{ s3Key, presignedUrl }` (and base64/mimeType when `includeBytes: true`)

#### Scenario: image.read accepts tool-asset key with valid toolId + access

- GIVEN the request carries `toolId: "T1"`
- AND `s3Key: "tools/T1/images/template.png"`
- AND the caller passes `canUserAccessTool("T1", callerUserId)`
- WHEN the bridge validates
- THEN ownership check passes
- AND the read proceeds

#### Scenario: image.read with includeBytes returns base64 + mimeType

- GIVEN the tool calls `image.read` with `includeBytes: true` (and a valid key under either ownership rule)
- WHEN the bridge dispatches
- THEN it fetches the buffer from S3
- AND responds with `{ s3Key, presignedUrl, base64, mimeType }`

#### Scenario: image.read rejects tool-asset key with mismatching toolId

- GIVEN the request carries `toolId: "T1"` and `s3Key: "tools/T2/images/x.png"`
- WHEN the bridge validates
- THEN it returns a 400-style error citing key/toolId mismatch

#### Scenario: image.read on missing key

- GIVEN the tool calls `image.read` with `includeBytes: true` and a valid-shape `s3Key` whose object does not exist in S3
- WHEN the bridge tries to fetch the buffer
- THEN it returns a 404-style error

#### Scenario: image.read does not charge quota

- GIVEN the caller is within their monthly quota
- WHEN they call `image.read` any number of times
- THEN no `TokenUsage` row is created
- AND `getMonthlyUsage` is unchanged
