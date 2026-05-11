# audio-transcription Specification

## Purpose
TBD - created by archiving change add-audio-transcription. Update Purpose after archive.
## Requirements
### Requirement: Core Transcription Service

The system SHALL expose a single internal `transcribeAudio()` function that wraps OpenAI's `/v1/audio/transcriptions` endpoint, with default model `gpt-4o-mini-transcribe`, auto language detection, and a 25MB hard size limit.

#### Scenario: Transcribe a short audio buffer

- GIVEN a Buffer of an mp3 audio (under 25MB)
- WHEN `transcribeAudio(buffer, "audio/mpeg")` is called
- THEN the system POSTs multipart to `https://api.openai.com/v1/audio/transcriptions` with `model=gpt-4o-mini-transcribe`
- AND `language` is not sent unless the caller passes it (auto-detect)
- AND the response is `{ text, durationSec }`

#### Scenario: Buffer over 25MB is rejected before the network call

- GIVEN a Buffer larger than 25MB
- WHEN `transcribeAudio` is called
- THEN it throws `AudioTranscriptionError` with a clear message naming the size and limit
- AND no network call is made

#### Scenario: OpenAI returns an error

- GIVEN OpenAI responds with a non-2xx status
- WHEN `transcribeAudio` parses the response
- THEN it throws `AudioTranscriptionError` carrying the upstream message and status

#### Scenario: Configuration check

- GIVEN `OPENAI_API_KEY` is not set
- WHEN `isAudioConfigured()` is called
- THEN it returns `false`
- AND `transcribeAudio` throws a configuration error when called

### Requirement: Audio Attachment Auto-transcription

Users SHALL be able to drag-drop or pick audio files in the chat input. The system SHALL upload the file to S3 under `audios/<userId>/<uuid>.<ext>` and, at chat-send time, transcribe it server-side and inline the resulting text into the prompt.

#### Scenario: Picking or dropping an audio file

- GIVEN a user selects a `.mp3` file in the chat file picker (or drops it into the chat area)
- WHEN `processFile` runs
- THEN the file is uploaded to S3 at `audios/<userId>/<uuid>.mp3`
- AND `UploadedFile` records `kind: "audio"`, `s3Key`, and `durationSec` (read via HTML5 Audio)
- AND the FileList renders an audio chip showing the filename and `mm:ss` duration

#### Scenario: Sending an audio attachment in a chat message

- GIVEN a chat request includes an `UploadedFile` with `kind: "audio"` and an `s3Key`
- WHEN `buildMessageContent` runs on the server
- THEN the system fetches the audio buffer from S3
- AND calls `transcribeAudio` (auto-detect language)
- AND inlines the transcript into the prompt as `[音檔: <name>, 時長 X:XX, 轉錄:]\n<text>`
- AND the original audio bytes are NOT base64-encoded into the prompt

#### Scenario: Audio over 25MB at upload time

- GIVEN a user attempts to upload a 30MB audio file
- WHEN the upload endpoint or `processFile` size check runs
- THEN the upload is rejected with a 413-equivalent error
- AND a toast informs the user of the 25MB limit

#### Scenario: Unsupported audio MIME

- GIVEN the user picks a `.flac` or `.aac` file
- WHEN `processFile` validates the MIME
- THEN the file is rejected with a clear "unsupported format" message
- AND only `mp3`, `wav`, `m4a`, `webm`, `ogg`, `mpeg` are accepted

### Requirement: AI-callable Transcription Tool

The chat AI SHALL have access to a `transcribeAudio` tool that operates on previously-uploaded audio S3 keys.

#### Scenario: AI transcribes a previously-uploaded audio

- GIVEN an `audioKey` belonging to the calling user (path starts with `audios/<userId>/`)
- WHEN the AI calls `transcribeAudio({ audioKey })`
- THEN the tool fetches the S3 buffer, calls the core service, and returns `{ type: "transcription", text, durationSec }`

#### Scenario: Tool rejects keys not owned by the user

- GIVEN an `audioKey` whose path does not start with `audios/<userId>/`
- WHEN the AI calls the tool
- THEN the tool returns `{ type: "transcription_error", reason }` and does not call the core service
- AND no S3 read is performed

#### Scenario: Tool surfaces upstream errors

- GIVEN the core service throws `AudioTranscriptionError`
- WHEN the tool catches it
- THEN the tool returns `{ type: "transcription_error", reason }` rather than letting the chat stream blow up

### Requirement: Vibe Coding Bridge Capability

User-built tools running in the Vibe Coding sandbox SHALL be able to request transcription through the api-bridge as a platform capability (always allowed, like `llm` and `scrape`).

#### Scenario: Tool calls bridge.transcribe with audioUrl

- GIVEN a user-built tool calls `bridge.transcribe({ audioUrl: "https://example.com/clip.mp3" })`
- WHEN the bridge dispatches the action
- THEN the server fetches the URL, calls the core service, and responds with `{ text, durationSec }`

#### Scenario: Tool calls bridge.transcribe with audioBase64

- GIVEN the tool passes `{ audioBase64, mime }` instead
- WHEN the bridge dispatches
- THEN the server decodes the base64 buffer and calls the core service
- AND responds with `{ text, durationSec }`

#### Scenario: Missing both audioUrl and audioBase64

- GIVEN neither field is provided
- WHEN the bridge validates the params
- THEN it returns a 400-style error stating that one of `audioUrl` or `audioBase64` is required

#### Scenario: transcribe is treated as a platform capability

- GIVEN `dataSourceId: "transcribe"` is passed to `/api/bridge`
- WHEN the route checks permissions
- THEN the request is allowed without checking `tool.dataSources` (same treatment as `llm`, `tooldb`, `scrape`)

### Requirement: Billing

The system SHALL record audio transcription usage in `TokenUsage` so it counts toward the user's monthly quota.

#### Scenario: Successful transcription writes TokenUsage

- GIVEN a transcription succeeds and reports `durationSec = 75` (1m15s)
- WHEN the system writes the usage row
- THEN `model = "gpt-4o-mini-transcribe"`, `inputTokens = 0`, `outputTokens = 2` (ceil 75/60 = 2 minutes)
- AND `costUsd = audioPricing["gpt-4o-mini-transcribe"] * 2 = 0.006`

#### Scenario: Failed transcription does not write usage

- GIVEN transcription throws
- WHEN the caller handles the error
- THEN no `TokenUsage` row is created
- AND the user's quota is not charged

