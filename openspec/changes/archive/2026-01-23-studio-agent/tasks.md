# Tasks: Studio Agent 架構（Vercel AI SDK）

## 1. 安裝與設定
- [x] 1.1 安裝 Vercel AI SDK：
  ```bash
  bun add ai @ai-sdk/anthropic
  ```
- [x] 1.2 建立 model registry（`src/lib/ai/models.ts`）
- [x] 1.3 設定環境變數（ANTHROPIC_API_KEY）

## 2. 定義 Tools
- [x] 2.1 建立 tools（`src/lib/ai/tools.ts`）
- [x] 2.2 實作 `getDataSourceSchema` tool
- [x] 2.3 實作 `querySampleData` tool
- [x] 2.4 實作 `listDataSources` tool
- [x] 2.5 實作 `updateCode` tool
- [ ] ~~2.6 實作 `previewCode` tool~~ (移至 Out of Scope - 未來再加視覺回饋)

## 3. Agent Loop 實作
- [x] 3.1 使用 AI SDK 的 `ToolLoopAgent` 實作自動多步驟工具呼叫
- [x] 3.2 迭代上限保護（ToolLoopAgent 內建）
- [x] 3.3 Tool call 事件通知（透過 fullStream）

## 4. 重構 Chat API
- [x] 4.1 更新 `/api/chat/route.ts` 使用 Vercel AI SDK
- [x] 4.2 支援 model 參數切換模型
- [x] 4.3 整合 ToolLoopAgent
- [x] 4.4 Streaming 回應（自訂 stream protocol）
  - `0:` - text-delta
  - `9:` - tool-call
  - `a:` - tool-result
  - `e:` - error

## 5. 前端整合
- [x] 5.1 自訂 stream parser（parseDataStreamLine）
- [x] 5.2 顯示 AI 正在使用的 tool（ToolCallDisplay 元件）
- [x] 5.3 顯示 tool 執行結果
- [x] 5.4 Tool call 收合功能（預設收合，點擊展開）
- [x] 5.5 Markdown 渲染支援（react-markdown + @tailwindcss/typography）

## 6. System Prompt 優化
- [x] 6.1 更新 system prompt 說明可用 tools 和開發流程
- [x] 6.2 說明 updateCode 工具的使用方式（純 JSX，不要 markdown）

## 7. Preview Panel 修復
- [x] 7.1 修復 React import 衝突（自動移除使用者程式碼中的 React import）
