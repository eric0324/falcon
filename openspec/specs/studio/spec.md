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
