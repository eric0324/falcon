# Tasks: suggest-data-sources

- [ ] 1. 在 `src/lib/ai/tools.ts` 新增 `suggestDataSources` tool 定義
- [ ] 2. 修改 `src/app/api/chat/route.ts` — 確保 suggestDataSources 永遠註冊在 filteredTools
- [ ] 3. 修改 `src/lib/ai/system-prompt.ts` — 更新提示，讓 AI 使用 suggestDataSources tool 而非文字提醒
- [ ] 4. 在 `src/components/tool-call-display.tsx` 新增 suggestDataSources 的渲染元件，顯示勾選 UI
- [ ] 5. 修改 `src/app/(app)/chat/page.tsx` — 處理確認回調：同步 dataSources state + 重送最後一則訊息
- [ ] 6. 測試各種情境：沒選資料來源、選了部分、AI 建議多個來源
