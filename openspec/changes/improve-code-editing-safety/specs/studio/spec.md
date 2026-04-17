# Studio Specification Deltas

## ADDED Requirements

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
