# Proposal: add-db-config

## Summary

將應用程式設定從 `.env` 檔案搬移到資料庫，並提供後台管理介面讓使用者在 UI 上修改設定。開源後使用者不需要手動編輯 `.env` 檔案。

## Motivation

專案即將開源，一般使用者不應該需要直接編輯 `.env` 來設定 API keys 和整合 tokens。透過後台 UI 管理設定，降低使用門檻。

## Scope

### 搬入 DB 的設定（加密儲存）

**OAuth**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

**AI API Keys**
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`

**整合 Tokens**
- `NOTION_TOKEN`
- `SLACK_BOT_TOKEN`, `SLACK_USER_TOKEN`
- `ASANA_PAT`, `ASANA_WORKSPACE_ID`
- `GITHUB_TOKEN`
- `VIMEO_ACCESS_TOKEN`, `VIMEO_USER_ID`
- `VOYAGE_API_KEY`

**分析平台**
- `PLAUSIBLE_API_KEY`, `PLAUSIBLE_SITE_ID`, `PLAUSIBLE_BASE_URL`
- `GA4_CLIENT_EMAIL`, `GA4_PRIVATE_KEY`, `GA4_PROPERTY_ID`
- `META_ADS_ACCESS_TOKEN`, `META_ADS_ACCOUNT_IDS`

**業務設定**
- `ALLOWED_EMAIL_DOMAIN`
- `DEFAULT_MONTHLY_QUOTA_USD`
- `PG_TEXT_SEARCH_CONFIG`

### 保留在 `.env` 的設定（啟動時必需）

- `DATABASE_URL` — Prisma 連線
- `NEXTAUTH_SECRET` — session 加密
- `NEXTAUTH_URL` — OAuth callback URL
- `REDIS_URL` — 佇列連線

## Approach

1. 新增 `SystemConfig` Prisma model，key-value 結構，值加密儲存
2. 建立 `getConfig(key)` 工具函式，優先讀 DB，fallback 到 `process.env`（向下相容）
3. 加入記憶體快取，避免每次都查 DB
4. 修改各模組的 env 讀取改為呼叫 `getConfig()`
5. 新增後台 `/admin/settings` 頁面，分組顯示設定項目
6. 敏感值使用現有 `src/lib/encryption.ts` 加密

## Fallback 機制

讀取順序：DB → `process.env` → 預設值

這確保：
- 現有 `.env` 使用者不受影響（向下相容）
- 新使用者可透過後台設定，不需要 `.env`

## Impact

| 區域 | 檔案數 | 改動程度 |
|------|--------|---------|
| 新增 SystemConfig model + migration | 1 | 新增 |
| 新增 getConfig 工具函式 + 快取 | 1 | 新增 |
| 修改 AI model 初始化 | 6 | 小 |
| 修改 auth.ts（動態 OAuth） | 1 | 中 |
| 修改整合 clients | 7-8 | 小 |
| 新增後台設定頁面 | 2-3 | 新增 |
