# Proposal: Studio Agent 架構（Vercel AI SDK）

## Summary
用 Vercel AI SDK 重構 Studio 的 AI 邏輯，導入 Agent 機制，讓 AI 可以使用工具、觀察結果、自動迭代修正。

## Why
- 現在的 Chat 是「盲寫」，AI 看不到執行結果
- AI 不知道資料來源的 schema，只能猜
- 出錯時需要使用者手動描述問題
- 目標是達到類似 Claude Code 的開發體驗

## What Changes
- 安裝 Vercel AI SDK（`ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`）
- 重構 `/api/chat` 使用 Vercel AI SDK
- 實作 Agent loop 和 Tools
- 支援多模型切換

## Motivation
Transform Studio from a simple chat interface to an intelligent agent that can use tools, observe results, and iteratively improve generated code.

## Scope

### In Scope
- Vercel AI SDK 整合
- Agent loop 實作
- 核心 Tools：
  - `get_datasource_schema` - 取得資料來源結構
  - `query_sample_data` - 查詢範例資料
  - `preview_code` - 執行並取得結果/錯誤
  - `update_code` - 修改程式碼
- 多模型支援（Claude, OpenAI, Gemini）
- Streaming 回應

### Out of Scope
- 視覺回饋（截圖預覽）- 未來再加
- 自動部署
- 複雜的 planning/reasoning

## Success Criteria
- [ ] 使用 Vercel AI SDK 的 `generateText` / `streamText`
- [ ] AI 可以呼叫 tools 並看到結果
- [ ] AI 可以自動迭代修正錯誤（最多 N 次）
- [ ] 支援切換不同模型
- [ ] Streaming 正常運作

## Dependencies
- 現有 Studio chat 實作
- 現有 API Bridge 實作

## Timeline
6-8 hours
