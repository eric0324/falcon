# Design: Add Vimeo Data Source

## Architecture

沿用 Notion / Slack / GitHub 的 env-based 整合模式（管理員設定一組 token，全公司共用）。

### 認證方式

管理員在 Vimeo Developer 建立 App，產生 Personal Access Token（帶 `public`, `private`, `stats` scope），寫入 `.env`：

```
VIMEO_ACCESS_TOKEN=xxxxx
VIMEO_USER_ID=/users/12345678
```

不需要 per-user OAuth，不需要新的 DB table。

### AI Tool 設計

單一 tool `vimeoQuery`，用 `action` 參數區分操作（與 `youtubeQuery` 一致）：

| Action | 說明 | Vimeo API |
|--------|------|-----------|
| `videos` | 列出使用者的影片 | `GET /users/{user_id}/videos` |
| `video` | 取得單支影片詳情 | `GET /videos/{id}` |
| `folders` | 列出資料夾 | `GET /users/{user_id}/projects` |
| `folder_videos` | 列出資料夾內影片 | `GET /users/{user_id}/projects/{id}/videos` |
| `analytics` | 觀看分析 | `GET /users/{user_id}/analytics` |

### Bridge Handler

在 `handlers.ts` 新增 `handleVimeo()`，dispatch pattern：
```
dataSourceId === "vimeo" → handleVimeo(action, params)
```

### 決策記錄

1. **Env-based token**：跟 Notion、Slack 一樣由管理員設定共用 token，不需要每個使用者各自授權。簡單、統一。

2. **不使用官方 SDK**：`@vimeo/vimeo` 是純 JS 沒有 TypeScript 型別，且只是薄封裝。直接用 fetch 呼叫 REST API 更輕量，也跟其他整合一致。

3. **Analytics fallback**：若 token 沒有 `stats` scope 權限，analytics action 會回傳明確的錯誤訊息，AI 可以據此提示。
