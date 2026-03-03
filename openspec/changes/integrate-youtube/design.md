# integrate-youtube: Design

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     UI Layer                                 │
│  data-source-selector.tsx → Google 服務列加入 YouTube        │
│  google-service-selector.tsx → YouTube connect/disconnect    │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                   AI Tools Layer                             │
│  youtube-tools.ts → createYouTubeTools(userId)               │
│    └── youtubeQuery: search|channel|video|comments|          │
│        captions|playlist|analytics                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                 Integration Client                           │
│  src/lib/integrations/youtube/client.ts                      │
│    ├── youtubeFetch(endpoint, params, accessToken)           │
│    ├── searchVideos(query, maxResults)                       │
│    ├── getChannelInfo(channelId)                             │
│    ├── getVideoDetails(videoId)                              │
│    ├── getVideoComments(videoId, maxResults)                 │
│    ├── getVideoCaptions(videoId, language?)                  │
│    ├── getPlaylistItems(playlistId, maxResults)              │
│    └── getAnalyticsReport(channelId, startDate, endDate,    │
│         metrics, dimensions)                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│               Google OAuth (existing)                        │
│  token-manager.ts → getValidToken(userId, "YOUTUBE")        │
│  /api/google/authorize → 加入 youtube scope                 │
│  /api/google/callback → 存入 YOUTUBE service token           │
│  UserGoogleServiceToken (service = YOUTUBE)                  │
└─────────────────────────────────────────────────────────────┘
```

## 複用現有元件

| 元件 | 複用方式 |
|------|---------|
| `token-manager.ts` | `getValidToken(userId, "YOUTUBE")` 取得有效 token |
| `/api/google/authorize` | scope mapping 加入 YOUTUBE 對應的 scope |
| `/api/google/callback` | 不需修改，已支援動態 service |
| `/api/google/disconnect` | 不需修改，已支援動態 service |
| `/api/google/status` | 不需修改，已動態查詢所有 service |
| `google-service-selector.tsx` | 加入 YouTube 服務項目 |

## 新增檔案

| 檔案 | 說明 |
|------|------|
| `src/lib/integrations/youtube/client.ts` | YouTube API client |
| `src/lib/integrations/youtube/index.ts` | re-export |
| `src/lib/integrations/youtube/client.test.ts` | 單元測試 |
| `src/lib/ai/youtube-tools.ts` | AI 工具定義 |
| `src/lib/ai/youtube-tools.test.ts` | 工具測試 |

## 修改檔案

| 檔案 | 修改內容 |
|------|---------|
| `prisma/schema.prisma` | `GoogleService` enum 加入 `YOUTUBE` |
| `src/app/api/google/authorize/route.ts` | YOUTUBE scope mapping |
| `src/app/api/chat/route.ts` | 註冊 YouTube tools |
| `src/lib/ai/system-prompt.ts` | 加入 YouTube 使用指南 |
| `src/lib/ai/google-tools.ts` | `allowedServices` 支援 "youtube" |
| `src/components/data-source-selector.tsx` | Google 服務加入 YouTube |
| `src/i18n/messages/en.json` | YouTube 相關翻譯 |
| `src/i18n/messages/zh-TW.json` | YouTube 相關翻譯 |

## API 呼叫模式

所有 YouTube API 呼叫使用統一的 `youtubeFetch` 封裝：

```typescript
async function youtubeFetch<T>(
  baseUrl: string,
  endpoint: string,
  params: Record<string, string>,
  accessToken: string
): Promise<T> {
  const url = new URL(`${baseUrl}/${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(`YouTube API error: ${error.error?.message || res.statusText}`);
  }
  return res.json();
}
```

## 回傳格式

統一回傳輕量格式，避免浪費 token：

```typescript
// search 回傳
{ success: true, videos: [{ videoId, title, channelTitle, publishedAt, viewCount }] }

// channel 回傳
{ success: true, channel: { id, title, subscriberCount, videoCount, viewCount, description } }

// video 回傳
{ success: true, video: { id, title, description, tags, publishedAt, duration, viewCount, likeCount, commentCount } }

// comments 回傳
{ success: true, comments: [{ author, text, likeCount, replyCount, publishedAt }] }

// analytics 回傳
{ success: true, rows: [{ dimensions: {...}, metrics: {...} }], totals: {...} }
```
