# Studio Spec Deltas — limit-text-file-upload

## ADDED Requirements

### Requirement: Text Attachment Size Limits
The system SHALL enforce token-based size limits on text-readable file attachments to prevent unbounded prompt growth.

#### Scenario: Small text file (no warning)
- GIVEN a user uploads a text file estimated under 8,000 tokens
- WHEN the chat request is built
- THEN the file content is included in full
- AND no warning is shown

#### Scenario: Medium text file (warning + truncate option)
- GIVEN a user uploads a text file estimated between 8,000 and 32,000 tokens
- WHEN the upload is processed in the frontend
- THEN a warning is shown with the estimated token count
- AND the user can choose to truncate (head / csv-smart) or send full
- AND the chosen mode is passed to the chat API

#### Scenario: Large text file (rejected)
- GIVEN a user uploads a text file estimated over 32,000 tokens
- WHEN the chat API receives the request
- THEN the API returns HTTP 400 with `{ error: "attachment_too_large", fileName, tokens, limit }`
- AND the frontend displays a clear error suggesting the user split the file

#### Scenario: Truncation marker in prompt
- GIVEN a text attachment was truncated
- WHEN the prompt content is built
- THEN the file block includes a clear marker: `[檔案: name, 已截斷：原 X 行，保留前 Y 行]`
- AND the AI is informed the data is incomplete

#### Scenario: CSV smart truncation
- GIVEN a user uploads a CSV file requiring truncation
- WHEN truncate mode is "csv-smart"
- THEN the first row (header) is preserved
- AND the next N rows fit within the token budget
- AND the marker indicates total rows vs. retained rows

#### Scenario: Image attachments unaffected
- GIVEN a user uploads an image file
- WHEN the chat request is built
- THEN no token-limit check is applied (images use Anthropic's per-image token estimate)
- AND the image is sent as before

#### Scenario: Binary attachments unchanged
- GIVEN a user uploads a binary (e.g. PDF, zip) file
- WHEN the chat request is built
- THEN only a filename hint is included, as in current behavior
- AND no token-limit check is applied to its byte size
