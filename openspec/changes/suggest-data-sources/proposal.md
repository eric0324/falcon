# Proposal: suggest-data-sources

## Summary

當使用者發送訊息但沒有選擇正確的資料來源時，AI 自動判斷並建議需要的資料來源，在對話中顯示勾選 UI，使用者確認後自動同步並重送訊息。

## Motivation

新手使用者不知道需要先在工具列勾選資料來源，導致 AI 無法取得資料而回答「請先開啟資料來源」。這個流程對新手不友善，應該由 AI 主動引導。

## Approach

利用現有的 tool call 機制，新增一個 `suggestDataSources` tool：

1. **AI 偵測** — system prompt 加入指令，當使用者的問題涉及未開啟的資料來源時，呼叫 `suggestDataSources` tool
2. **前端渲染** — tool-call-display 看到 `suggestDataSources` 時，渲染資料來源勾選 UI
3. **使用者確認** — 勾選後按確認，前端同步到工具列的 dataSources state
4. **重送訊息** — 自動重送使用者最後一則訊息，這次帶著正確的資料來源

## Tool 設計

```typescript
suggestDataSources({
  sources: ["meta_ads", "ga4"],  // 建議的資料來源 ID
  reason: "查詢廣告成效需要開啟 Meta Ads 資料來源"
})
```

`sources` 使用與 DataSourceSelector 相同的 ID 格式：
- Google: `google_sheets`, `google_drive`, `google_calendar`, `google_gmail`, `google_youtube`
- 整合: `notion`, `slack`, `asana`, `github`, `vimeo`
- 分析: `plausible`, `ga4`, `meta_ads`

## System Prompt 變更

在 `NO_DATA_SOURCE_INSTRUCTIONS` 和一般模式都加入指引：

> When the user asks about data that requires a data source not currently enabled, call the `suggestDataSources` tool with the recommended sources. Do NOT just tell them to enable it manually.

## Impact

| 區域 | 檔案 | 改動 |
|------|------|------|
| Tool 定義 | `src/lib/ai/tools.ts` | 新增 suggestDataSources tool |
| System prompt | `src/lib/ai/system-prompt.ts` | 修改提示，使用 tool 而非文字提醒 |
| Chat API | `src/app/api/chat/route.ts` | suggestDataSources 永遠註冊，不受 dataSources 過濾 |
| 前端 UI | `src/components/tool-call-display.tsx` | 新增 suggestDataSources 的渲染元件 |
| Chat page | `src/app/(app)/chat/page.tsx` | 處理確認後同步 dataSources + 重送 |
