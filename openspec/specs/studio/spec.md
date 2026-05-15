# Studio Specification

## Purpose
The Studio is the core Vibe Coding interface where users create tools through natural language conversation.
## Requirements
### Requirement: Chat Interface
The system SHALL provide a chat interface for tool creation.

#### Scenario: Send message
- WHEN a user types a requirement and presses Enter
- THEN the message is sent to Claude API
- AND Claude's response streams back in real-time

#### Scenario: Code extraction
- WHEN Claude responds with code in ```jsx blocks
- THEN the code is extracted and sent to the preview panel

### Requirement: Real-time Preview
The system MUST display generated code in a live preview using Sandpack.

#### Scenario: Preview update
- WHEN new code is extracted from Claude's response
- THEN Sandpack hot-reloads the preview
- AND errors are displayed if the code is invalid

#### Scenario: API mock injection
- WHEN the preview loads
- THEN window.companyAPI is injected with mock implementations
- AND the tool can call internal APIs in preview mode

### Requirement: Conversation History
The system SHALL maintain conversation context within a session.

#### Scenario: Continue conversation
- WHEN a user sends follow-up messages
- THEN all previous messages are included in the Claude context
- AND Claude can reference earlier requirements

#### Scenario: Save conversation
- WHEN a user deploys a tool
- THEN the conversation history is saved with the tool

### Requirement: System Prompt
The system MUST use a structured system prompt for Claude.

#### Scenario: Code generation constraints
- GIVEN the system prompt includes output rules
- WHEN Claude generates code
- THEN the output is a single React component with export default
- AND only Tailwind CSS is used for styling
- AND code is wrapped in ```jsx blocks

### Requirement: 圖片 Provider 選擇器
Studio SHALL 在 chat model 選擇器旁提供獨立的圖片 provider 選擇器。

#### Scenario: 顯示選擇器
- GIVEN 使用者進入 Studio
- WHEN 畫面渲染完成
- THEN chat model 選擇器旁出現圖片 provider 下拉
- AND 選項為 `Imagen 4` 與 `GPT-Image-1`
- AND 預設值為 `Imagen 4`

#### Scenario: 切換 provider
- GIVEN 使用者切換圖片 provider 下拉
- WHEN 選擇新值
- THEN 該值保存在對話狀態
- AND 下次觸發 `generateImage` 時此值作為 provider 參數傳入

### Requirement: 訊息中圖片渲染
Studio SHALL 在訊息列顯示 `generateImage` tool 回傳的圖片與錯誤狀態。

#### Scenario: 渲染生成圖片
- GIVEN 訊息包含 `image_generated` tool result
- WHEN 渲染訊息
- THEN 顯示圖片（寬度自適應）
- AND 提供下載按鈕
- AND 提供點擊放大檢視

#### Scenario: Presigned URL 過期重簽
- GIVEN 圖片載入失敗（URL 過期）
- WHEN 前端偵測到圖片 error event
- THEN 呼叫 `/api/chat/presign-image?key=<s3Key>` 取得新 URL
- AND 以新 URL 重試顯示

#### Scenario: 渲染錯誤
- GIVEN 訊息包含 `image_error` tool result
- WHEN 渲染訊息
- THEN 顯示錯誤卡片，包含 `reason` 文字

### Requirement: 本地圖檔上傳
Studio SHALL 允許使用者在訊息輸入區上傳本地圖檔，供圖生圖使用。

#### Scenario: 拖拉上傳
- GIVEN 使用者拖拉圖檔到訊息輸入區
- WHEN 放開滑鼠
- THEN 檔案 POST 到 `/api/chat/upload-image`
- AND 上傳成功後顯示縮圖與移除按鈕
- AND 送出訊息時夾帶 `s3Key`

#### Scenario: 點擊選檔
- GIVEN 使用者點擊輸入區的上傳按鈕
- WHEN 選擇圖檔
- THEN 流程同拖拉上傳

#### Scenario: 上傳失敗
- GIVEN 檔案過大或 MIME 不符
- WHEN upload endpoint 回錯
- THEN 輸入區顯示錯誤訊息，不夾帶任何 `s3Key`

#### Scenario: 取消上傳
- GIVEN 上傳完成後使用者尚未送出訊息
- WHEN 點擊縮圖上的移除按鈕
- THEN 從待送訊息中移除該 `s3Key`

### Requirement: 訊息附件持久化顯示
Studio SHALL 將使用者送出訊息時夾帶的附件資訊（檔名、類型、大小、S3 key）持久化於 `ConversationMessage.attachments`，並在 user message 氣泡下方持續顯示附件預覽，包含在頁面重新整理後仍可見。

#### Scenario: 送出帶附件的訊息
- GIVEN 使用者上傳了一張 PNG 圖片與一個 PDF 檔案
- WHEN 送出訊息
- THEN request body 包含 `attachments: [{ name, type, size, s3Key? }, ...]`，圖片有 `s3Key`、PDF 無
- AND chat API 將 attachments 寫入該 user message

#### Scenario: 圖片附件縮圖渲染
- GIVEN `ConversationMessage.attachments` 有一筆含 `s3Key` 的 png / jpeg / webp
- WHEN `getMessages` 讀取訊息
- THEN 為該 attachment 以 `getPresignedUrl` 簽 URL 並注入 `presignedUrl`
- AND 前端在 user message 氣泡下方以 `<img>` 顯示縮圖

#### Scenario: 非圖片附件顯示檔名與 icon
- GIVEN attachments 中有一筆 PDF（無 `s3Key`）
- WHEN 訊息渲染
- THEN 前端顯示檔名與對應 icon（沿用既有 `getFileIcon` 邏輯）
- AND 不嘗試取得 presigned URL

#### Scenario: 重新整理後附件仍可見
- GIVEN 使用者送出包含圖片附件的訊息並重新整理頁面
- WHEN 訊息從 DB 讀回
- THEN attachments 欄位解析並為圖片簽新 URL
- AND 縮圖在 user message 氣泡下方正常顯示

#### Scenario: Presigned URL 過期自動重簽
- GIVEN 附件縮圖對應的 presigned URL 已過期
- WHEN `<img>` 載入失敗
- THEN 前端呼叫 `/api/chat/presign-image?key=<s3Key>` 取得新 URL
- AND 以新 URL 重試顯示

#### Scenario: 歷史訊息不重送附件給 LLM
- GIVEN 使用者開啟含附件歷史的對話並送出新訊息
- WHEN chat route 組裝送往 LLM 的 messages
- THEN 歷史訊息只包含 text content 與 toolCalls，不重新附加圖片 base64
- AND 新訊息的 `files` 仍透過既有機制塞 base64 parts 給 LLM

### Requirement: 局部程式碼編輯 editCode tool
Studio SHALL provide an `editCode` AI tool that performs exact-string find/replace on the current tool code, used for small changes instead of rewriting the whole file.

#### Scenario: 找到唯一匹配並替換
- GIVEN the current tool code contains the exact string `find` in exactly one place
- WHEN AI calls `editCode({ find, replace, explanation })`
- THEN the tool's code becomes `code.replace(find, replace)`
- AND a snapshot of the old code is written before the update
- AND the tool returns `{ type: "code_update", code, explanation, toolId }`

#### Scenario: find 在 code 中找不到
- GIVEN `find` does not appear in the current code
- WHEN AI calls `editCode`
- THEN the tool returns `{ type: "edit_code_error", reason }` whose reason tells AI the string was not found
- AND the tool's code is unchanged
- AND no snapshot is created

#### Scenario: find 出現多次需要更多 context
- GIVEN `find` appears 2+ times in the current code
- WHEN AI calls `editCode`
- THEN the tool returns `{ type: "edit_code_error", reason }` whose reason asks AI to add more surrounding context so the find becomes unique
- AND the tool's code is unchanged
- AND no snapshot is created

### Requirement: System prompt 引導保留既有程式碼
The system prompt SHALL instruct the model to prefer `editCode` for small changes and, when `updateCode` is used, to preserve every part of the existing code that the user did not ask to change.

#### Scenario: Prompt 指引 editCode 用於小改
- WHEN `buildSystemPrompt` is called
- THEN the prompt contains guidance that `editCode` is preferred for localized changes (label tweaks, bug fixes, adding a field, style adjustments)
- AND `updateCode` is reserved for explicit rewrites or edits touching a large portion of the file

#### Scenario: Prompt 要求 updateCode 不得砍掉未提功能
- WHEN `buildSystemPrompt` is called
- THEN the prompt explicitly tells the model that when it calls `updateCode`, the new code must preserve every feature not mentioned by the user
- AND instructs it to fall back to `editCode` when unsure

### Requirement: Edit-mode 工具載入須驗證 HTTP 狀態
Chat 頁進入工具編輯模式時，當 `/api/tools/:id` 回應為非 2xx 狀態，前端 SHALL 視為載入失敗，不得把 error body 當作工具資料填入 form state。

#### Scenario: 載入成功時填入表單
- GIVEN URL 為 `/chat?edit=:id`
- AND `/api/tools/:id` 回 200 並包含完整工具資料
- WHEN 編輯模式 effect 執行
- THEN form state（name / description / code / category / tags / visibility）依工具資料填入

#### Scenario: API 回非 2xx 時顯示錯誤而非空白
- GIVEN URL 為 `/chat?edit=:id`
- AND `/api/tools/:id` 回 401 / 403 / 404 / 500（body 為 `{ error: "..." }`）
- WHEN 編輯模式 effect 執行
- THEN form state 不被覆寫成 undefined
- AND 顯示 `loadToolError` toast（既有 catch 路徑）

#### Scenario: Network error 走相同錯誤路徑
- GIVEN URL 為 `/chat?edit=:id`
- AND fetch 因網路或其他原因 reject
- WHEN 編輯模式 effect 執行
- THEN 行為與非 2xx 一致：toast 提示載入失敗，state 不變

### Requirement: Chat API Integrates Personal Memory
The chat API SHALL integrate personal memory extraction and recall into the request lifecycle.

#### Scenario: Recall runs before model call
- GIVEN a user sends a message in chat
- WHEN the chat API handler runs
- THEN `recallMemories(userMessage, userId)` runs before assembling the final system prompt
- AND recalled memories are injected into the system prompt

#### Scenario: Explicit extraction runs synchronously with user message
- GIVEN a user message contains an explicit memory keyword
- WHEN the chat API handler runs
- THEN explicit extraction runs BEFORE or IN PARALLEL with the model call (implementation choice)
- AND if a Memory is created, the stream includes an `i:` info event with `{ memoryCreated: { title, type } }`
- AND the client renders a toast based on this event

#### Scenario: Passive extraction runs after response completes
- GIVEN the assistant stream has finished
- WHEN the chat API closes the stream
- THEN a passive extraction job is triggered (async, non-blocking)
- AND the job writes to `SuggestedMemory` with `conversationId` set

#### Scenario: Memory integration does not break existing flows
- GIVEN a user with zero memories
- WHEN they send a chat message
- THEN the chat API behaves identically to pre-change behavior
- AND no extra latency from recall is observable to the user (>100ms)

### Requirement: Chat UI Surfaces Memory Events
The chat UI SHALL surface memory-related events from the chat stream and provide a side panel for pending suggestions.

#### Scenario: Memory toast displays on explicit capture
- GIVEN the stream emits a `memoryCreated` info event
- WHEN the client processes the event
- THEN a toast "已記住：〔title〕" appears near the assistant message
- AND the toast auto-dismisses after 5 seconds

#### Scenario: First memory toast includes management link
- GIVEN this is the user's first-ever memory (server indicates `isFirstMemory: true` in the event)
- WHEN the toast renders
- THEN it includes a link "到 /memory 管理"

#### Scenario: Side panel shows pending suggestions
- GIVEN the current conversation has `SuggestedMemory` rows with `status = pending`
- WHEN the chat page loads
- THEN a collapsible "建議記憶" section appears in the side panel
- AND each suggestion shows `title`, `type`, `content`
- AND each has two buttons: 確認 and 拒絕

#### Scenario: Accept button confirms a suggestion
- GIVEN a pending suggestion is visible
- WHEN the user clicks 確認
- THEN `POST /api/memory/suggested/:id/accept` is called
- AND on success, the suggestion disappears from the side panel
- AND a toast "已加入記憶" appears briefly

#### Scenario: Dismiss button rejects a suggestion
- GIVEN a pending suggestion is visible
- WHEN the user clicks 拒絕
- THEN `POST /api/memory/suggested/:id/dismiss` is called
- AND on success, the suggestion disappears and does not reappear

### Requirement: Memory Management Page
The system SHALL provide `/memory` as the management page for personal memories.

#### Scenario: Page lists memories grouped by type
- GIVEN a user visits `/memory`
- WHEN the page loads
- THEN memories are shown grouped by `type` (preference / context / rule / fact)
- AND each group header shows the count

#### Scenario: Memory can be edited inline
- GIVEN a memory is displayed
- WHEN the user clicks edit
- THEN title and content become editable
- AND save triggers PATCH `/api/memory/:id`
- AND the UI shows the updated memory on success

#### Scenario: Memory can be deleted with confirmation
- GIVEN a memory is displayed
- WHEN the user clicks delete
- THEN a confirmation dialog appears
- AND on confirm, DELETE `/api/memory/:id` is called
- AND the memory is removed from the list

#### Scenario: Empty state guides user
- GIVEN a user has no memories
- WHEN they visit `/memory`
- THEN an empty state shows: "還沒有任何記憶。對話中說『記住...』或『以後都...』就能建立記憶。"

### Requirement: Chat API Token Usage
The system SHALL report token usage per chat request including cached-input breakdown for Anthropic models.

#### Scenario: Usage log includes cache stats
- WHEN a chat request completes
- THEN the server log records inputTokens, outputTokens, cachedReadTokens, cacheCreationTokens
- AND the user's quota deduction uses the discounted cost formula

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

## UI Components

| Component | Description |
|-----------|-------------|
| ChatPanel | Left panel with message input and history |
| PreviewPanel | Right panel with Sandpack preview |
| ToolNameDialog | Modal for naming tool before deploy |
| DeployButton | Button to save and deploy the tool |

## System Prompt Template

```
你是內部工具產生器。

## 輸出規則
- 輸出單一 React 元件，使用 export default
- 使用 Tailwind CSS
- 不要用任何外部套件

## 可用的內部 API
呼叫方式：window.companyAPI.xxx()

- expense.submit({ amount, date, receipt, description })
- expense.getHistory()
- hr.getEmployees()
- hr.getDepartments()
- report.query(sqlLikeString)

## 輸出格式
只輸出程式碼，用 ```jsx 包起來，不要其他解釋。
```
