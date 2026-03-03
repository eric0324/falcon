# YouTube Integration Spec

## Overview
整合 YouTube Data API v3 和 YouTube Analytics API，讓 AI 助手能查詢影片數據與頻道分析。

## Scenarios

### S1: 連接 YouTube
- **Given** 使用者在資料來源選擇器中點擊「連接 YouTube」
- **When** 系統導向 Google OAuth 授權頁面，請求 `youtube.readonly` + `yt-analytics.readonly` scope
- **Then** 授權成功後，token 存入 `UserGoogleServiceToken`（service = YOUTUBE），UI 顯示「已連接」

### S2: 搜尋影片
- **Given** 使用者選擇 YouTube 資料來源並提問「搜尋 XXX 相關影片」
- **When** AI 呼叫 `youtubeQuery` 工具（action = search）
- **Then** 回傳影片標題、頻道名稱、發布日期、觀看數、影片 ID

### S3: 查詢頻道資訊
- **Given** 使用者提問「查詢 XXX 頻道的資訊」
- **When** AI 呼叫 `youtubeQuery` 工具（action = channel）
- **Then** 回傳頻道名稱、訂閱數、影片總數、總觀看數、描述

### S4: 查詢影片詳情與統計
- **Given** 使用者提問某部影片的詳情
- **When** AI 呼叫 `youtubeQuery` 工具（action = video）
- **Then** 回傳標題、描述、標籤、發布日期、時長、觀看數、按讚數、留言數

### S5: 查詢影片留言
- **Given** 使用者想看某部影片的留言
- **When** AI 呼叫 `youtubeQuery` 工具（action = comments）
- **Then** 回傳留言內容、作者、按讚數、回覆數（最多 50 則）

### S6: 下載影片字幕
- **Given** 使用者想取得影片字幕內容
- **When** AI 呼叫 `youtubeQuery` 工具（action = captions）
- **Then** 回傳字幕文字內容（優先手動字幕，fallback 自動字幕）

### S7: 查詢頻道 Analytics
- **Given** 使用者想查看自家頻道的分析數據
- **When** AI 呼叫 `youtubeQuery` 工具（action = analytics）
- **Then** 回傳指定期間的觀看時長、觀看次數、訂閱增減、流量來源等

### S8: 查詢熱門影片排行
- **Given** 使用者想知道頻道的熱門影片
- **When** AI 呼叫 `youtubeQuery` 工具（action = analytics，dimension = video）
- **Then** 回傳依觀看數排序的影片列表與各項指標

### S9: 未授權時的錯誤處理
- **Given** 使用者未連接 YouTube
- **When** AI 嘗試呼叫 YouTube 工具
- **Then** 回傳 `{ success: false, error: "YouTube not connected" }`

### S10: Token 過期自動刷新
- **Given** YouTube access token 已過期
- **When** AI 呼叫 YouTube 工具
- **Then** 系統自動使用 refresh token 取得新的 access token，請求正常完成

## Data Model

### GoogleService enum 新增值
```prisma
enum GoogleService {
  SHEETS
  DRIVE
  CALENDAR
  GMAIL
  YOUTUBE    // 新增
}
```

## Tool Schema

### youtubeQuery
單一工具，用 `action` 參數區分操作：

```typescript
inputSchema: z.object({
  action: z.enum([
    "search",      // 搜尋影片
    "channel",     // 頻道資訊
    "video",       // 影片詳情
    "comments",    // 影片留言
    "captions",    // 影片字幕
    "playlist",    // 播放清單內容
    "analytics",   // 頻道分析
  ]),
  query: z.string().optional(),           // search 用
  channelId: z.string().optional(),       // channel/playlist/analytics 用
  videoId: z.string().optional(),         // video/comments/captions 用
  playlistId: z.string().optional(),      // playlist 用
  startDate: z.string().optional(),       // analytics 用 (YYYY-MM-DD)
  endDate: z.string().optional(),         // analytics 用 (YYYY-MM-DD)
  metrics: z.array(z.string()).optional(), // analytics 用
  dimensions: z.array(z.string()).optional(), // analytics 用
  maxResults: z.number().optional(),      // 回傳數量限制 (預設 10)
  language: z.string().optional(),        // captions 語言偏好
})
```

## API Endpoints Used

### YouTube Data API v3 (base: https://www.googleapis.com/youtube/v3)
| Endpoint | Action | Quota Cost |
|----------|--------|------------|
| `GET /search` | search | 100 units |
| `GET /channels` | channel | 1 unit |
| `GET /videos` | video | 1 unit |
| `GET /commentThreads` | comments | 1 unit |
| `GET /captions` | captions (list) | 50 units |
| `GET /captions/{id}` | captions (download) | 200 units |
| `GET /playlistItems` | playlist | 1 unit |

### YouTube Analytics API v2 (base: https://youtubeanalytics.googleapis.com/v2)
| Endpoint | Action | Notes |
|----------|--------|-------|
| `GET /reports` | analytics | 需要頻道擁有者授權 |

## Quota Management
- 每日上限 10,000 units（search 最貴，每次 100 units）
- AI system prompt 提醒優先用 `channel` + `video` 而非 `search`
- 必要時可向 Google 申請更高 quota
