# Tasks: Add Vimeo Data Source

## Phase 1: Client

- [x] **T1: Vimeo Client** — 建立 `src/lib/integrations/vimeo/client.ts`，實作 `isVimeoConfigured()`、`listVideos`、`getVideo`、`listFolders`、`getFolderVideos`、`getAnalytics`
- [x] **T2: Vimeo Index** — 建立 `src/lib/integrations/vimeo/index.ts`，匯出 public API
- [ ] **T3: Vimeo Client Tests** — 為 client 函式撰寫 unit test

## Phase 2: AI 整合

- [x] **T4: AI Tool** — 建立 `src/lib/ai/vimeo-tools.ts`，定義 `vimeoQuery` tool
- [x] **T5: Chat Route** — 更新 `src/app/api/chat/route.ts`，在 selectedSources 包含 "vimeo" 時載入 vimeo tools
- [x] **T6: Status API** — 更新 `src/app/api/integrations/status/route.ts`，加入 vimeo 狀態

## Phase 3: Bridge & UI

- [x] **T7: Bridge Handler** — 在 `src/lib/bridge/handlers.ts` 新增 `handleVimeo` 並接入 dispatch
- [x] **T8: Data Source Selector** — 更新 `src/components/data-source-selector.tsx`，新增 Vimeo 選項
- [x] **T9: Logging** — 更新 `src/lib/data-source-log.ts` 的 `extractDataSourceInfo`，加入 vimeo mapping

## Phase 4: 收尾

- [x] **T10: Env & i18n** — 更新 `.env.example`（`VIMEO_ACCESS_TOKEN`、`VIMEO_USER_ID`）+ 中英文翻譯
