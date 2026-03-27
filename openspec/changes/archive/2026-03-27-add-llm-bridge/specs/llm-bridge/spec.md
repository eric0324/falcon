# LLM Bridge Specification

## Purpose
讓已發布的工具可以透過 bridge 呼叫 LLM 處理文字，使用預定義的 action 確保安全性。

## ADDED Requirements

### Requirement: LLM Bridge Handler
系統 SHALL 提供 `llm` data source，讓工具透過 bridge 呼叫 LLM。

#### Scenario: Summarize text
- GIVEN 工具的 dataSources 包含 "llm"
- WHEN 工具呼叫 `execute("llm", "summarize", { text: "..." })`
- THEN 系統用固定的摘要 system prompt + user text 呼叫 LLM
- AND 回傳 `{ text: "摘要結果", model: "claude-haiku", tokenUsage: { input: N, output: N } }`

#### Scenario: Translate text
- GIVEN 工具的 dataSources 包含 "llm"
- WHEN 工具呼叫 `execute("llm", "translate", { text: "...", targetLanguage: "English" })`
- THEN 系統用固定的翻譯 system prompt（含目標語言）+ user text 呼叫 LLM
- AND 回傳翻譯結果

#### Scenario: Extract information
- GIVEN 工具的 dataSources 包含 "llm"
- WHEN 工具呼叫 `execute("llm", "extract", { text: "...", fields: ["name", "email", "phone"] })`
- THEN 系統用固定的萃取 system prompt（含 fields 定義）+ user text 呼叫 LLM
- AND 回傳 JSON 格式的萃取結果

#### Scenario: Classify text
- GIVEN 工具的 dataSources 包含 "llm"
- WHEN 工具呼叫 `execute("llm", "classify", { text: "...", categories: ["正面", "負面", "中性"] })`
- THEN 系統用固定的分類 system prompt（含 categories）+ user text 呼叫 LLM
- AND 回傳分類結果

#### Scenario: Unknown action
- WHEN 工具呼叫不支援的 action
- THEN 回傳 `{ error: "不支援的 LLM 操作: {action}" }`

### Requirement: Model Selection
工具 SHALL 能指定要使用的 LLM 模型。

#### Scenario: Specify model
- WHEN 工具傳入 `model: "gemini-pro"` 參數
- THEN 系統使用指定的模型呼叫

#### Scenario: Default model
- WHEN 工具未指定 model 參數
- THEN 系統使用預設模型（claude-haiku）

#### Scenario: Invalid model
- WHEN 工具傳入不存在的 model 名稱
- THEN 回傳 `{ error: "不支援的模型: {model}" }`

### Requirement: Token Limit
系統 SHALL 限制單次 LLM 呼叫的 input token 數量。

#### Scenario: Within limit
- GIVEN input text 在 4000 tokens 以內
- WHEN 呼叫 LLM bridge
- THEN 正常處理

#### Scenario: Exceed limit
- GIVEN input text 超過 4000 tokens
- WHEN 呼叫 LLM bridge
- THEN 截斷 text 至 4000 tokens
- AND 在回應中加入 `truncated: true` 標記

### Requirement: Security - Fixed System Prompts
系統 MUST 使用固定的 system prompt，工具不能自訂。

#### Scenario: Attempt custom prompt
- WHEN 工具傳入 `systemPrompt` 參數
- THEN 系統忽略該參數，使用固定的 system prompt

### Requirement: LLM Call Logging
系統 MUST 記錄所有 LLM bridge 呼叫。

#### Scenario: Log LLM call
- WHEN LLM bridge 呼叫完成
- THEN 記錄到 DataSourceLog：dataSourceId="llm", action, model, tokenUsage, success/failure, durationMs

### Requirement: LLM Data Source UI
資料來源選擇器 SHALL 顯示 LLM 選項。

#### Scenario: Show LLM in selector
- WHEN 使用者開啟資料來源選擇器
- THEN 在適當分類下顯示 LLM 選項
- AND 顯示為「永遠可用」（不需要連接或設定）
