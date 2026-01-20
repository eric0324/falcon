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
