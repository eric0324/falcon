# Tasks: add-db-config

## Phase 1: 基礎建設

- [ ] 1. 新增 `SystemConfig` Prisma model + migration
- [ ] 2. 建立 `src/lib/config.ts` — `getConfig()`, `getConfigRequired()`, `setConfig()`, `invalidateConfigCache()` 函式
- [ ] 3. 為 config 工具函式寫 unit tests

## Phase 2: 模組改造

- [ ] 4. 改造 `src/lib/auth.ts` — `authOptions` 改為 `getAuthOptions()` 動態函式
- [ ] 5. 更新所有 `authOptions` 引用處（API routes, middleware 等）
- [ ] 6. 改造 `src/lib/ai/models.ts` — 靜態 models object 改為 `getModel()` async factory
- [ ] 7. 更新所有 `models[...]` 呼叫處（5 個檔案）
- [ ] 8. 改造整合 clients — Notion / Slack / Asana / GitHub / Vimeo / Plausible / GA4 / Meta Ads（每個 1-2 行）
- [ ] 9. 改造其他引用 — `ALLOWED_EMAIL_DOMAIN`, `DEFAULT_MONTHLY_QUOTA_USD`, `PG_TEXT_SEARCH_CONFIG`, `VOYAGE_API_KEY`

## Phase 3: 後台 UI

- [ ] 10. 新增 `GET/PUT /api/admin/settings` API routes
- [ ] 11. 新增 `/admin/settings` 後台設定頁面（分組表單 + masked 顯示）
- [ ] 12. 為 settings API 寫 tests

## Phase 4: 收尾

- [ ] 13. 更新 `.env.example` — 移除已搬到 DB 的項目，只保留 4 個必要項
- [ ] 14. 更新 README — 說明初次設定流程（先設定 .env 基礎項 → 啟動 → 後台設定其餘項目）
