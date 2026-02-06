# Design: 對話自動壓縮 (Auto Compact)

## 架構決策

### 1. Token 估算策略

採用**字元數粗估**而非精確 tokenizer：

```typescript
function estimateTokens(text: string): number {
  let tokens = 0;
  for (const char of text) {
    // CJK 字元約 1 token/字
    if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(char)) {
      tokens += 1;
    } else {
      // 英文及其他約 4 chars/token
      tokens += 0.25;
    }
  }
  return Math.ceil(tokens);
}
```

**理由**：
- 不需要安裝額外的 tokenizer 套件（如 tiktoken）
- 估算誤差在 10-20% 範圍，配合保守閾值 (80%) 已足夠
- Server-side 計算，不影響前端效能

### 2. Context Window 限制

各 model 的 context window 與觸發閾值：

| Model | Context Window | 觸發閾值 (80%) |
|-------|---------------|----------------|
| claude-sonnet | 200,000 | 160,000 |
| claude-haiku | 200,000 | 160,000 |
| gpt-4o | 128,000 | 102,400 |
| gpt-4o-mini | 128,000 | 102,400 |
| gemini-flash | 1,048,576 | 838,860 |
| gemini-pro | 1,048,576 | 838,860 |

### 3. 壓縮流程

```
handleChatRequest(messages, modelId)
  │
  ├─ estimateMessagesTokens(messages)
  │     → totalTokens
  │
  ├─ totalTokens < threshold?
  │     → YES: 跳過壓縮，正常處理
  │     → NO:  繼續壓縮流程
  │
  ├─ splitMessages(messages)
  │     → oldMessages (前段，要摘要)
  │     → recentMessages (後段，保留原文，預設最近 6 條)
  │
  ├─ generateSummary(oldMessages)
  │     → 使用 claude-haiku 產生摘要（非 streaming）
  │     → 回傳 summary string
  │
  ├─ buildCompactedMessages(summary, recentMessages)
  │     → [{ role: "user", content: "[對話摘要]\n{summary}" }, ...recentMessages]
  │
  └─ 繼續 streamText(compactedMessages)
```

### 4. 摘要策略

#### 保留多少最近訊息

保留最近 **6 條**（約 3 輪 user-assistant 對話）。

**理由**：
- 太少：AI 可能丟失當前工作脈絡
- 太多：壓縮效果不顯著
- 3 輪對話通常足以維持當前任務的連貫性

#### 摘要 Prompt

```
你是一個對話摘要助手。請將以下對話歷史壓縮成精簡摘要。

保留以下資訊：
1. 使用者的核心需求和目標
2. 已做出的重要決策和選擇
3. 目前程式碼的狀態摘要（如果有的話）
4. 關鍵的工具呼叫結果摘要
5. 未解決的問題或待辦事項

不需要保留：
- 逐字對話內容
- 完整的程式碼（只保留描述）
- 工具呼叫的原始資料（只保留結論）

輸出格式：使用精簡的條列式摘要，不超過 500 字。
```

#### 摘要用什麼 model

固定使用 `claude-haiku`。

**理由**：
- 成本最低（摘要不需要高品質推理）
- 速度最快（減少壓縮延遲）
- 中文摘要品質足夠

### 5. Summary 注入方式

將 summary 作為**第一條 user message**注入：

```typescript
const compactedMessages = [
  {
    role: "user",
    content: `[以下是先前對話的摘要]\n\n${summary}\n\n[摘要結束，以下是最近的對話]`
  },
  {
    role: "assistant",
    content: "好的，我已了解先前的對話脈絡。請繼續。"
  },
  ...recentMessages
];
```

**理由**：
- 不修改 system prompt（system prompt 有自己的職責）
- 以 user-assistant 對組成，符合 message format 規範
- AI 能明確區分「摘要」和「實際對話」

### 6. Stream 事件

新增 compact 事件類型 `c:`：

```
c:{"compacted":true,"originalCount":24,"keptCount":6}
```

前端收到此事件後，在 messages 之間插入一個分隔 UI：

```
─── 對話已自動壓縮 (保留最近 6 條訊息) ───
```

### 7. Database Schema

```prisma
model Conversation {
  // ... 現有欄位
  summary    String?   @db.Text   // compact 產生的摘要，可能較長
}
```

- 使用 `@db.Text` 而非預設 `VARCHAR(191)`，因為摘要可能超過 191 字元
- 每次 compact 時覆寫（只保留最新的 summary）
- 載入對話時如果有 summary，直接使用，不需要重新產生

### 8. 重載對話的行為

```
載入對話 (GET /api/conversations/:id)
  │
  ├─ 回傳 { messages, summary, ... }
  │
  └─ 前端儲存 summary
       │
       └─ 下次送 chat request 時
            ├─ 如果有 summary 且 messages 接近閾值
            │     → 使用 summary + 最近 messages
            └─ 否則
                  → 正常送全部 messages
```

## 元件設計

### CompactIndicator

在訊息列表中顯示壓縮提示的小元件：

```tsx
function CompactIndicator({ originalCount, keptCount }: Props) {
  return (
    <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
      <div className="flex-1 h-px bg-border" />
      <span>對話已自動壓縮 (保留最近 {keptCount} 條訊息)</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}
```

## 測試策略

1. **單元測試**：`estimateTokens`、`shouldCompact`、`splitMessages` 的正確性
2. **整合測試**：`compactMessages` 呼叫 AI 並回傳正確格式
3. **API 測試**：Chat API 在長對話時正確觸發壓縮
4. **前端測試**：CompactIndicator 正確顯示

## 效能影響

| 指標 | 壓縮前 | 壓縮後 |
|------|--------|--------|
| 送出的 token 數 | 全部歷史 (~50k+) | summary + 最近 6 條 (~5k) |
| API 延遲 | 因 token 多而慢 | 額外 1-2 秒摘要 + 更快的主回應 |
| 成本 | 每次都送全量 | 大幅降低（壓縮後每次只送 ~5k token） |
