# Design: 啟用 Anthropic Prompt Caching

## 背景

Anthropic Prompt Caching 允許把大型、重複的 prompt 片段（system、tools、長 context）標記為「可快取」。相同內容的後續請求在 5 分鐘內命中快取，輸入 token 只付 0.1x 單價。

文件：https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching

## Vercel AI SDK 的支援方式

`@ai-sdk/anthropic` v3 透過 `providerOptions.anthropic.cacheControl` 傳遞快取標記：

```ts
streamText({
  model: anthropic("claude-opus-4-7"),
  system: [
    {
      type: "text",
      text: SYSTEM_PROMPT,
      providerOptions: {
        anthropic: { cacheControl: { type: "ephemeral" } },
      },
    },
  ],
  messages,
  tools,
});
```

Tools 的 cache 一般標在「最後一個 tool」，SDK 會把快取邊界切在那裡。

## Falcon 目前的問題

`src/app/api/chat/route.ts:451-456`：

```ts
const result = streamText({
  model: selectedModel,
  system: systemPrompt,   // 字串，不可直接帶 providerOptions
  messages: currentMessages,
  tools: filteredTools,
});
```

- `system` 是字串 → 需改為 `[{ type: "text", text, providerOptions }]` 形式
- `tools` 是 plain object → 需對其中一個 tool 的 definition 加 providerOptions
- `selectedModel` 可能是 Anthropic / OpenAI / Google → 必須條件分支

## 設計決策

### 決策 1：用 helper 函式隱藏 provider 分支

新增 `src/lib/ai/cache-control.ts`：

```ts
export function cacheableSystem(
  text: string,
  modelId: ModelId
): string | SystemMessagePart[] {
  if (!isAnthropicModel(modelId)) return text;
  return [
    {
      type: "text",
      text,
      providerOptions: {
        anthropic: { cacheControl: { type: "ephemeral" } },
      },
    },
  ];
}

export function cacheableTools<T extends Record<string, unknown>>(
  tools: T,
  modelId: ModelId
): T {
  if (!isAnthropicModel(modelId)) return tools;
  // 在最後一個 tool 上加 providerOptions
  const entries = Object.entries(tools);
  if (entries.length === 0) return tools;
  const [lastKey, lastTool] = entries[entries.length - 1];
  return {
    ...tools,
    [lastKey]: {
      ...(lastTool as object),
      providerOptions: {
        anthropic: { cacheControl: { type: "ephemeral" } },
      },
    },
  } as T;
}
```

**理由**：呼叫端保持乾淨，不需要每個 streamText 都寫 if/else。

### 決策 2：快取邊界的數量上限

Anthropic 一次請求最多 4 個 cache breakpoint。我們先用 2 個：

1. System prompt 尾端
2. Tools 尾端

Messages 暫不快取（單次對話內 ROI 低，且對話中途訊息會變）。

### 決策 3：System prompt 內部順序優化

`buildSystemPrompt(dataSources)` 目前會依 `dataSources` 動態拼接。為最大化快取命中率：

- **BASE_PROMPT**（所有對話都有）放最前
- **dataSources 相關區塊**放後面

這樣即使 dataSources 變動，前面的 BASE_PROMPT 區塊仍能命中快取（靠 SDK 的 prefix matching）。

但注意：Anthropic cache 是 exact prefix 匹配，只要中間有任一 token 不同，後面的都 miss。所以 dataSources 的組合若高頻變動，實際命中率取決於使用者切換頻率。第一版先不過度優化，實測後再說。

### 決策 4：成本統計

Anthropic API 回傳 usage 多了兩個欄位：
- `cache_creation_input_tokens`：首次寫入快取，單價 1.25x input
- `cache_read_input_tokens`：快取命中，單價 0.1x input

更新 `estimateCost()`：

```ts
function estimateCost(
  model: string,
  inputTokens: number,        // non-cached
  outputTokens: number,
  cachedInputTokens = 0,      // cache read
  cacheCreationTokens = 0     // cache write
): number {
  const p = modelPricing[model];
  return (
    inputTokens * p.input +
    cachedInputTokens * p.input * 0.1 +
    cacheCreationTokens * p.input * 1.25 +
    outputTokens * p.output
  ) / 1_000_000;
}
```

### 決策 5：非 Anthropic provider 行為

OpenAI 有自己的 automatic prompt caching（無需標記），Google 無 public prompt caching API。我們只處理 Anthropic 的顯式標記；其他 provider `cacheableSystem` / `cacheableTools` 直接回傳原值。

## 預期效果

假設 system + tools 約 23K tokens（15K + 8K），一次對話 5 輪：

| 指標 | 現況 | 改後 |
|------|------|------|
| Input tokens（system + tools 部分） | 23K × 5 = 115K | 23K × 1.25（寫入）+ 23K × 0.1 × 4（讀取） = ~38K |
| 節省比例 | - | ~67% 的 system/tools 成本 |

整體對話成本（含 messages、tool results、output）預期下降 25-40%，與使用情境有關。

## 風險與備案

- **SDK 版本限制**：若 `ai` v6 對 system 陣列 + providerOptions 的行為與預期不符，退回到 `@anthropic-ai/sdk` 直接呼叫（放棄 Vercel AI SDK 抽象）。這是最壞情況，但影響範圍可控，只需改 route.ts
- **Cache miss 永遠發生**：若 system prompt 每輪都變（例如使用者切換 dataSources），則 cache 幾乎無效。需要先實測 dataSource 穩定度
