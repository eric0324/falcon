# integrate-youtube

## Summary
新增 YouTube 整合，讓 AI 助手能查詢公開頻道數據（影片列表、統計、留言、字幕）以及公司頻道的 YouTube Analytics 數據（觀看時長、流量來源、觀眾分布），使用 Google OAuth 認證。

## Motivation
行銷團隊需要在對話中查詢 YouTube 數據進行競品分析與自家頻道成效追蹤。目前已有 Google OAuth 基礎設施，YouTube 可直接複用，降低開發成本。

## Scope
- **IN**:
  - 公開數據：搜尋影片、頻道資訊、影片列表與統計、留言、字幕下載
  - Analytics：觀看時長、流量來源、觀眾地區、裝置分布、熱門影片
  - 播放清單管理（唯讀）
- **OUT**: 上傳影片、編輯影片資訊、刪除影片、直播管理、收益數據（需額外 scope 且多數帳戶無權限）

## Approach
複用現有 Google OAuth 認證流程，新增 YouTube 專用 scope：

1. **Auth 層**：`GoogleService` enum 新增 `YOUTUBE`，OAuth scope 加入 `youtube.readonly` + `yt-analytics.readonly`
2. **Client 層** (`src/lib/integrations/youtube/client.ts`)：封裝 YouTube Data API v3 + YouTube Analytics API
3. **Tools 層** (`src/lib/ai/youtube-tools.ts`)：AI 工具定義
4. **Route 層**：chat route 註冊工具、status route 回報狀態
5. **UI 層**：Google 服務選擇器加入 YouTube 選項
6. **System Prompt**：加入 YouTube 使用指南

## Authentication
複用現有 Google OAuth 流程（`/api/google/authorize` → `/api/google/callback`），新增 scope：

| Scope | 用途 |
|-------|------|
| `https://www.googleapis.com/auth/youtube.readonly` | 讀取頻道、影片、播放清單、留言、字幕 |
| `https://www.googleapis.com/auth/yt-analytics.readonly` | 讀取 YouTube Analytics 數據 |

Token 存入 `UserGoogleServiceToken`（service = `YOUTUBE`），與 Sheets/Drive/Calendar/Gmail 同樣管理方式。

## API Notes
- **YouTube Data API v3**：REST API，使用 access token + API key
  - `channels.list`：頻道資訊
  - `search.list`：搜尋影片（每次 100 quota units）
  - `videos.list`：影片詳情與統計
  - `commentThreads.list`：影片留言
  - `captions.list` + `captions.download`：字幕
  - `playlistItems.list`：播放清單內容
- **YouTube Analytics API v2**：
  - `reports.query`：觀看時長、流量來源、觀眾維度
- **Quota**: YouTube Data API 每日 10,000 units（可申請增加）
  - search.list = 100 units、其他 list = 1 unit

## Dependencies
- 需在 Google Cloud Console 啟用 YouTube Data API v3 + YouTube Analytics API
- 無新增 npm 套件（直接用 REST API + 現有 Google OAuth token）
