# image-generation Spec Delta: add-image-bridge-upload-read

新增 bridge 的 `image.upload` 與 `image.read` 兩個 action，補上「使用者上傳圖到工具」與「工具讀回 / 重新簽 URL」兩個缺口。

## ADDED Requirements

### Requirement: Vibe Coding Bridge — Image Upload and Read

User-built tools running in the Vibe Coding sandbox SHALL be able to upload images from end-user input and read back stored images via the api-bridge platform capability `image`, using actions `upload` and `read`.

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

#### Scenario: image.upload missing base64 or mimeType

- GIVEN the tool calls `image.upload` without `base64`, or without `mimeType`
- WHEN the bridge validates
- THEN it returns a 400-style error naming the missing field

#### Scenario: image.upload result is reusable as sourceImageKey

- GIVEN `image.upload` returned `{ s3Key: "images/<userId>/abc.png", presignedUrl }`
- WHEN the tool subsequently calls `image.edit` passing `sourceImageKey: "images/<userId>/abc.png"`
- THEN the edit proceeds (ownership check passes because the upload wrote to the caller's prefix)

#### Scenario: image.read defaults to URL-only

- GIVEN the tool calls `window.companyAPI.execute("image", "read", { s3Key: "images/<userId>/abc.png" })`
- WHEN the bridge dispatches
- THEN it returns `{ s3Key, presignedUrl }` only
- AND it does NOT fetch the object body from S3
- AND `base64` / `mimeType` are absent from the response

#### Scenario: image.read with includeBytes returns base64 + mimeType

- GIVEN the tool calls `image.read` with `includeBytes: true`
- WHEN the bridge dispatches
- THEN it fetches the buffer from S3
- AND responds with `{ s3Key, presignedUrl, base64, mimeType }` where `mimeType` is derived from the file extension (`.png` → `image/png`, etc.)

#### Scenario: image.read enforces ownership

- GIVEN the tool calls `image.read` with `s3Key` whose path does NOT start with `images/<callerUserId>/`
- WHEN the bridge validates
- THEN it returns a 400-style error citing ownership
- AND no S3 access is performed

#### Scenario: image.read on missing key

- GIVEN the tool calls `image.read` with `includeBytes: true` and an `s3Key` whose object does not exist in S3
- WHEN the bridge tries to fetch the buffer
- THEN it returns a 404-style error

#### Scenario: image.read does not charge quota

- GIVEN the caller is within their monthly quota
- WHEN they call `image.read` any number of times
- THEN no `TokenUsage` row is created
- AND `getMonthlyUsage` is unchanged
