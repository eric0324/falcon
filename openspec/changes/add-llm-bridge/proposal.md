# Proposal: Add LLM Bridge

## Change ID
`add-llm-bridge`

## Summary
讓已發布的工具可以透過 bridge 呼叫 LLM，使用預定義的 action（summarize、translate、extract、classify）處理文字，所有模型皆開放選用。

## Motivation
目前工具只能顯示和視覺化資料，無法在 runtime 做文字處理（摘要、翻譯、分類等）。開放 LLM bridge 後，工具就能做到像是「摘要每篇文章」「翻譯留言」「分類客服問題」等操作。

## Scope

### In Scope
- Bridge 新增 `llm` data source，支援 4 個 action：`summarize`、`translate`、`extract`、`classify`
- 所有已註冊的模型皆可選用（claude-sonnet、claude-haiku、gpt-5-mini、gpt-5-nano、gemini-flash、gemini-pro）
- 單次 input token 限制（max 4000 tokens）
- 防止 prompt injection：工具不能自訂 system prompt，每個 action 有固定的 system prompt
- 所有呼叫走 DataSourceLog 記錄
- 資料來源選擇器新增 LLM 選項
- 聊天室 AI 在產生工具時，知道有 LLM bridge 可用

### Out of Scope
- 自由對話（chat completion with history）
- Streaming 回應（bridge 是 request-response 模式）
- 工具自訂 system prompt
- 圖片 / 多模態輸入

## Approach
沿用現有的 bridge pattern，新增一個 `handleLLM` handler。每個 action 有對應的固定 system prompt，工具只傳 input text 和參數（如目標語言），不能控制 system prompt。

## Risks
- 成本：每次 bridge 呼叫都會產生 token 費用，熱門工具可能導致大量呼叫
- 延遲：LLM 回應比一般 API 慢（2-10 秒），工具需要處理好 loading 狀態
