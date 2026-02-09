# integrate-slack: Tasks

## Task 1: Slack Client
- [ ] 建立 `src/lib/integrations/slack/client.ts`
  - `isSlackConfigured()` / `isSlackSearchConfigured()`
  - `slackFetch()` 封裝 API 呼叫（同 Notion 的 `notionFetch`）
  - `listChannels()` - 列出 Bot 已加入的公開頻道
  - `getChannelMessages(channelId, limit)` - 讀取頻道訊息
  - `getThreadReplies(channelId, threadTs)` - 讀取討論串
  - `searchMessages(query, limit)` - 搜尋（User Token + 過濾非公開）
  - `getUserName(userId)` - 查使用者名稱（含記憶體快取）
- [ ] 建立 `src/lib/integrations/slack/index.ts` re-export
- [ ] 建立 `src/lib/integrations/slack/client.test.ts` 單元測試
- **驗證**: `npm test -- slack/client` 全綠

## Task 2: Slack AI Tool
- [ ] 建立 `src/lib/ai/slack-tools.ts`
  - `createSlackTools()` 回傳 `{ slackSearch }` 工具
  - action: list / read / thread / search
  - 回傳輕量格式，避免 token 浪費
- [ ] 建立 `src/lib/ai/slack-tools.test.ts` 單元測試
- **驗證**: `npm test -- slack-tools` 全綠

## Task 3: Route Integration
- [ ] `src/app/api/chat/route.ts`: import slackTools，加入 dataSources 過濾邏輯
- [ ] `src/app/api/integrations/status/route.ts`: 回報 `slack: isSlackConfigured()`
- **驗證**: 手動測試 `/api/integrations/status` 回傳 slack 狀態

## Task 4: System Prompt
- [ ] `src/lib/ai/system-prompt.ts`: 加入 Slack 使用指南區塊
  - 工具操作說明
  - 搜尋策略（list → read/search → thread）
- **驗證**: 選擇 Slack 資料來源時，system prompt 包含指南

## Task 5: UI Integration
- [ ] `src/components/data-source-selector.tsx`: 第三方服務加入 Slack 選項
- [ ] 更新 i18n：`slack.description` 改為「搜尋和瀏覽 Slack 公開頻道」
- [ ] `.env.example`: 加入 `SLACK_BOT_TOKEN` 和 `SLACK_USER_TOKEN`
- **驗證**: UI 中可以選擇/取消 Slack，狀態正確顯示

## Dependencies
- Task 1 → Task 2（tools 依賴 client）
- Task 2 → Task 3（route 依賴 tools）
- Task 1 → Task 3（status route 依賴 client）
- Task 4、Task 5 可與 Task 2 平行
