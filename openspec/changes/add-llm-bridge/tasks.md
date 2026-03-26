# Tasks: Add LLM Bridge

## Phase 1: Handler

- [x] **T1: LLM Handler** — 在 `src/lib/bridge/handlers.ts` 新增 `handleLLM(action, params)`，實作 4 個 action 的固定 system prompt + `generateText` 呼叫
- [x] **T2: Token Truncation** — 實作 input text 的 token 估算與截斷邏輯（4000 token / 12000 字元上限）
- [x] **T3: Dispatch** — 在 `dispatchBridge` 加入 `llm` 的路由

## Phase 2: 整合

- [x] **T4: Bridge Permission** — 更新 `src/app/api/bridge/route.ts`，讓 `llm` 跳過 dataSources 權限檢查（平台內建能力）
- [x] **T5: System Prompt** — 更新 `src/lib/ai/system-prompt.ts`，加入 LLM bridge 的使用說明，讓聊天室 AI 產生工具時知道可以用
