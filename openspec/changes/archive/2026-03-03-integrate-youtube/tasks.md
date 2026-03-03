# integrate-youtube: Tasks

## Task 1: Schema + Auth
- [x] `prisma/schema.prisma`：`GoogleService` enum 新增 `YOUTUBE`
- [x] `src/app/api/google/authorize/route.ts`：scope mapping 加入 YOUTUBE
  - `youtube.readonly` + `yt-analytics.readonly`
- [x] 執行 `bunx prisma db push` 同步 schema
- **驗證**: Google OAuth 授權頁面顯示 YouTube 相關權限

## Task 2: YouTube Client
- [x] 建立 `src/lib/integrations/youtube/client.ts`
  - `youtubeFetch()` 統一 API 呼叫封裝
  - `searchVideos(accessToken, query, maxResults)` — 搜尋影片
  - `getChannelInfo(accessToken, channelId)` — 頻道資訊
  - `getVideoDetails(accessToken, videoId)` — 影片詳情與統計
  - `getVideoComments(accessToken, videoId, maxResults)` — 影片留言
  - `getVideoCaptions(accessToken, videoId, language?)` — 字幕下載
  - `getPlaylistItems(accessToken, playlistId, maxResults)` — 播放清單內容
  - `getAnalyticsReport(accessToken, channelId, startDate, endDate, metrics, dimensions)` — Analytics 報表
- [x] 建立 `src/lib/integrations/youtube/index.ts` re-export
- [x] 建立 `src/lib/integrations/youtube/client.test.ts` 單元測試
- **驗證**: `bun test youtube/client` 全綠

## Task 3: YouTube AI Tool
- [x] 建立 `src/lib/ai/youtube-tools.ts`
  - `createYouTubeTools(userId)` 回傳 `{ youtubeQuery }` 工具
  - 使用 `token-manager.ts` 取得有效 token
  - action: search | channel | video | comments | captions | playlist | analytics
  - 統一回傳輕量格式
- [x] 建立 `src/lib/ai/youtube-tools.test.ts` 單元測試
- **驗證**: `bun test youtube-tools` 全綠

## Task 4: Route Integration
- [x] `src/app/api/chat/route.ts`：
  - import `createYouTubeTools`
  - `dataSources` 過濾：`google_youtube` → 建立 YouTube tools
- [x] `src/lib/ai/google-tools.ts`：`allowedServices` 支援 `"youtube"` key
- **驗證**: 選擇 YouTube 資料來源後，AI 可呼叫 `youtubeQuery` 工具

## Task 5: System Prompt
- [x] `src/lib/ai/system-prompt.ts`：加入 YouTube 使用指南
  - 工具操作說明
  - Quota 提醒（search 100 units，其他 1 unit，每日 10,000 上限）
  - 建議策略：先 channel → video detail，避免濫用 search
- **驗證**: 選擇 YouTube 時，system prompt 包含指南

## Task 6: UI + i18n
- [x] `src/components/data-source-selector.tsx` 或 Google 服務選擇器：加入 YouTube 選項
- [x] `src/i18n/messages/en.json`：新增 `google.youtube` 翻譯
- [x] `src/i18n/messages/zh-TW.json`：新增 `google.youtube` 翻譯
- [x] `.env.example`：備註需啟用 YouTube Data API v3 + YouTube Analytics API
- **驗證**: UI 中可以連接/選擇 YouTube，狀態正確顯示

## Dependencies
- Task 1 → Task 2（client 需要 schema 支援 YOUTUBE service）
- Task 2 → Task 3（tools 依賴 client）
- Task 3 → Task 4（route 依賴 tools）
- Task 5、Task 6 可與 Task 3 平行
