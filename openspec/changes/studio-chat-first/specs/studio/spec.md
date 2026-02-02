# Studio Spec Deltas — studio-chat-first

## MODIFIED Requirements

### Requirement: Chat Interface
The system SHALL provide a chat-first interface that supports both general conversation and tool creation.

#### Scenario: Direct entry
- WHEN a user navigates to /studio
- THEN the chat input is immediately available
- AND no setup dialog is shown

#### Scenario: Full-width chat
- GIVEN no code has been generated in the session
- WHEN the user is chatting
- THEN the chat panel occupies the full width
- AND the preview panel is not rendered

#### Scenario: Auto-expand preview
- GIVEN the user is in a full-width chat session
- WHEN the AI generates code via the updateCode tool
- THEN the layout splits into chat (50%) and preview (50%)
- AND the preview panel renders the generated code

### Requirement: Conditional Deploy
The system SHALL only show the deploy button when there is generated code.

#### Scenario: No code yet
- GIVEN no code has been generated
- THEN the deploy/save button is hidden

#### Scenario: Code exists
- GIVEN code has been generated via the updateCode tool
- THEN the deploy/save button is visible
- AND clicking it opens the DeployDialog

### Requirement: System Prompt
The system MUST use a system prompt that supports both conversation and code generation.

#### Scenario: General conversation
- GIVEN the user asks a question or requests data analysis
- WHEN Claude processes the message
- THEN Claude responds conversationally without forcing code output

#### Scenario: Code generation request
- GIVEN the user requests a UI tool or application
- WHEN Claude generates code
- THEN the code follows the single-component, Tailwind-only rules
- AND Claude uses the updateCode tool to submit it

## REMOVED Requirements

### Requirement: Initial Setup Dialog
The InitialSetupDialog that required tool name before chatting is removed. Tool naming is deferred to the DeployDialog at publish time.
