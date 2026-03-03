# integrate-slack: Design

## Architecture

```
環境變數 (SLACK_BOT_TOKEN + SLACK_USER_TOKEN)
    ↓
Client 層 (src/lib/integrations/slack/)
    - isSlackConfigured()
    - listChannels()         ← Bot Token
    - getChannelMessages()   ← Bot Token
    - getThreadReplies()     ← Bot Token
    - searchMessages()       ← User Token + 過濾非公開頻道
    - getUserName()          ← Bot Token + 記憶體快取
    ↓
Tools 層 (src/lib/ai/slack-tools.ts)
    - createSlackTools()
    - 單一工具 slackSearch（action 模式，同 notionSearch）
    ↓
Route 層
    - chat/route.ts: 註冊 slackTools
    - integrations/status/route.ts: 回報 slack 狀態
    ↓
UI 層
    - data-source-selector.tsx: 加入 Slack 選項
    - system-prompt.ts: 加入 Slack 使用指南
```

## Tool Design

單一工具 + action 模式（同 Notion）：

```
slackSearch({ action: "list" })
  → 列出 Bot 已加入的公開頻道 [{ id, name, topic, memberCount }]

slackSearch({ action: "read", channelId })
  → 讀取頻道最新訊息 [{ user, text, ts, replyCount }]

slackSearch({ action: "thread", channelId, threadTs })
  → 讀取討論串回覆 [{ user, text, ts }]

slackSearch({ action: "search", search: "關鍵字" })
  → 全文搜尋（僅公開頻道結果）[{ channel, user, text, ts, permalink }]
```

## Token & Scope

| Token | Scope | 用途 |
|-------|-------|------|
| `SLACK_BOT_TOKEN` | `channels:read` | 列出公開頻道 |
| `SLACK_BOT_TOKEN` | `channels:history` | 讀取公開頻道訊息 |
| `SLACK_BOT_TOKEN` | `users:read` | userId → 顯示名稱 |
| `SLACK_USER_TOKEN` | `search:read` | 搜尋訊息 |

不申請的 scope（隱私考量）：
- `groups:read` / `groups:history`（私有頻道）
- `im:read` / `im:history`（DM）
- `mpim:read` / `mpim:history`（群組 DM）

## Privacy Filter

搜尋結果處理流程：
```
User Token search → 原始結果（可能含私有頻道）
    ↓ filter: channel.is_private === false
過濾後結果（僅公開頻道）→ 回傳給 AI
```

## User Name Cache

Slack 訊息只有 userId (如 `U01234`)，需查 `users.info` 取得顯示名稱。
使用 Module-level Map 做記憶體快取，避免重複查詢。

## Decisions

1. **不用 `@slack/web-api`**：直接用 fetch，同 Notion client 做法，最小依賴。
2. **不用 OAuth 流程**：同 Notion，環境變數設定 token。
3. **搜尋 fallback**：如果 `SLACK_USER_TOKEN` 未設定，search action 回傳提示訊息，不報錯。
