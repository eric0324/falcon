# Design: Add LLM Bridge

## Architecture

沿用現有 bridge pattern，新增 `llm` data source。

### 工具端呼叫方式

```javascript
// 在工具的 React 程式碼中
const result = await window.companyAPI.execute("llm", "summarize", {
  text: "一段很長的文字...",
  model: "claude-haiku",  // 選用，預設 claude-haiku
});
// result = { text: "摘要結果..." }
```

### Action 定義

每個 action 有固定的 system prompt，工具不能覆寫。

| Action | 用途 | 參數 | System Prompt（固定） |
|--------|------|------|----------------------|
| `summarize` | 摘要 | `text`, `model?`, `maxLength?` | 「你是摘要助手。請用繁體中文簡潔地摘要以下內容。」 |
| `translate` | 翻譯 | `text`, `model?`, `targetLanguage` | 「你是翻譯助手。請將以下內容翻譯成{targetLanguage}。只輸出翻譯結果。」 |
| `extract` | 資訊萃取 | `text`, `model?`, `fields` | 「你是資訊萃取助手。從以下內容中萃取指定欄位，以 JSON 格式回傳。」 |
| `classify` | 分類 | `text`, `model?`, `categories` | 「你是分類助手。將以下內容分到最適合的類別。只輸出類別名稱。」 |

### Token 限制

- Input text 最多 4000 tokens（約 6000 中文字）
- 超過時截斷並回傳警告
- 使用 AI SDK 的 `generateText` 呼叫，不做 streaming

### 安全設計

1. **固定 System Prompt**：每個 action 的 system prompt 寫死在 handler 裡，工具只能傳 user message 的部分（text 參數）
2. **不支援自訂 prompt**：沒有 `freeform` 或 `chat` action
3. **Token 上限**：防止單次呼叫燒太多錢
4. **日誌**：所有呼叫記錄到 DataSourceLog，可追溯

### Bridge Handler

```
dispatchBridge("llm", action, params)
  → handleLLM(action, params)
    → 根據 action 組合固定 system prompt + user text
    → 呼叫 AI SDK generateText
    → 回傳 { text, model, tokenUsage }
```

### 決策記錄

1. **固定 action 而非自由 prompt**：防止 prompt injection，也讓成本可預估。如果未來需要更多 action 再擴充。
2. **所有模型開放**：不限制模型選擇，讓工具開發者根據需求自己決定用哪個。
3. **不做 streaming**：bridge 是 request-response 模式，streaming 會大幅增加複雜度。工具端自己顯示 loading 即可。
