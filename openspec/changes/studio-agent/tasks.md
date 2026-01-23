# Tasks: Studio Agent 架構（Vercel AI SDK）

## 1. 安裝與設定
- [ ] 1.1 安裝 Vercel AI SDK：
  ```bash
  pnpm add ai @ai-sdk/anthropic @ai-sdk/openai @ai-sdk/google
  ```
- [ ] 1.2 建立 model registry（`src/lib/ai/models.ts`）：
  ```typescript
  import { anthropic } from '@ai-sdk/anthropic';
  import { openai } from '@ai-sdk/openai';

  export const models = {
    'claude-sonnet': anthropic('claude-sonnet-4-20250514'),
    'claude-haiku': anthropic('claude-3-5-haiku-20241022'),
    'gpt-4o': openai('gpt-4o'),
  };
  ```
- [ ] 1.3 設定環境變數（ANTHROPIC_API_KEY, OPENAI_API_KEY）

## 2. 定義 Tools
- [ ] 2.1 建立 tools 目錄（`src/lib/ai/tools/`）
- [ ] 2.2 實作 `get_datasource_schema` tool：
  ```typescript
  const getDataSourceSchema = tool({
    description: '取得資料來源的 table 和 column 結構',
    parameters: z.object({
      dataSourceId: z.string(),
    }),
    execute: async ({ dataSourceId }) => {
      // 查詢 DataSource，回傳 schema
    },
  });
  ```
- [ ] 2.3 實作 `query_sample_data` tool：
  ```typescript
  const querySampleData = tool({
    description: '查詢資料來源的範例資料（限 5 筆）',
    parameters: z.object({
      dataSourceId: z.string(),
      table: z.string(),
    }),
    execute: async ({ dataSourceId, table }) => {
      // SELECT * FROM table LIMIT 5
    },
  });
  ```
- [ ] 2.4 實作 `preview_code` tool：
  ```typescript
  const previewCode = tool({
    description: '在 sandbox 中執行程式碼並回傳結果或錯誤',
    parameters: z.object({
      code: z.string(),
    }),
    execute: async ({ code }) => {
      // 執行 code，回傳 { success, output, error }
    },
  });
  ```
- [ ] 2.5 實作 `update_code` tool：
  ```typescript
  const updateCode = tool({
    description: '更新目前的程式碼',
    parameters: z.object({
      code: z.string(),
      explanation: z.string(),
    }),
    execute: async ({ code, explanation }) => {
      // 更新 code state，回傳確認
    },
  });
  ```

## 3. Agent Loop 實作
- [ ] 3.1 建立 agent runner（`src/lib/ai/agent.ts`）：
  ```typescript
  export async function runAgent({
    model,
    messages,
    tools,
    maxIterations = 10,
    onToolCall,
    onUpdate,
  }) {
    let iterations = 0;

    while (iterations < maxIterations) {
      const result = await generateText({
        model,
        messages,
        tools,
      });

      if (result.toolCalls.length === 0) {
        return result; // 完成
      }

      for (const toolCall of result.toolCalls) {
        onToolCall?.(toolCall);
        const toolResult = await executeTool(toolCall);
        messages.push({ role: 'tool', content: toolResult });
      }

      iterations++;
    }
  }
  ```
- [ ] 3.2 加入迭代上限保護
- [ ] 3.3 加入 tool call 事件通知（讓前端知道 AI 在做什麼）

## 4. 重構 Chat API
- [ ] 4.1 更新 `/api/chat/route.ts` 使用 Vercel AI SDK
- [ ] 4.2 支援 model 參數切換模型
- [ ] 4.3 支援 dataSources 參數
- [ ] 4.4 整合 agent loop
- [ ] 4.5 Streaming 回應（使用 `streamText`）

## 5. 前端整合
- [ ] 5.1 使用 Vercel AI SDK 的 `useChat` hook（可選）
- [ ] 5.2 顯示 AI 正在使用的 tool
- [ ] 5.3 顯示 tool 執行結果
- [ ] 5.4 顯示迭代次數

## 6. System Prompt 優化
- [ ] 6.1 更新 system prompt 說明可用 tools：
  ```
  你是一個 AI 開發助手，可以使用以下工具：
  - get_datasource_schema: 取得資料來源結構
  - query_sample_data: 查詢範例資料
  - preview_code: 執行並測試程式碼
  - update_code: 更新程式碼

  開發流程：
  1. 先用 get_datasource_schema 了解資料結構
  2. 用 query_sample_data 看範例資料
  3. 生成程式碼並用 preview_code 測試
  4. 如果有錯誤，自動修正並重試
  ```
- [ ] 6.2 加入資料來源資訊到 context
