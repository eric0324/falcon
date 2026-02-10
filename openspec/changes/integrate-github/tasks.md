# integrate-github: Tasks

## Task 1: GitHub Client
- [ ] 建立 `src/lib/integrations/github/client.ts`
  - `isGitHubConfigured()` — 檢查 GITHUB_TOKEN
  - `githubFetch<T>(path, options?)` — 封裝 fetch + auth header + error handling
  - `listRepos(org?, sort?, limit?)` — 列出 repo（預設 sort=pushed, limit=20）
  - `listPullRequests(repo, state?, limit?)` — 列出 PR（預設 state=open, limit=20）
  - `getPullRequest(repo, prNumber)` — PR 詳情 + files + reviews（合併 3 API）
  - `searchCode(query, repo?, limit?)` — 搜尋程式碼（含 text_matches）
  - `listCommits(repo, branch?, limit?)` — commit 記錄（預設 limit=20）
  - Patch 截斷邏輯（每檔 500 字元，最多 20 檔）
- [ ] 建立 `src/lib/integrations/github/index.ts` re-export
- [ ] 建立 `src/lib/integrations/github/client.test.ts` 單元測試
- **驗證**: `npm test -- github/client` 全綠

## Task 2: GitHub AI Tool
- [ ] 建立 `src/lib/ai/github-tools.ts`
  - `createGitHubTools()` 回傳 `{ githubQuery }` 工具
  - action: listRepos / listPRs / readPR / searchCode / commits
  - Zod schema：action, repo, org, prNumber, search, branch, state, limit
  - 回傳標準格式（success/service/data/hint）
- [ ] 建立 `src/lib/ai/github-tools.test.ts` 單元測試
- **驗證**: `npm test -- github-tools` 全綠

## Task 3: Route Integration
- [ ] `src/app/api/chat/route.ts`: import githubTools，加入 dataSources 過濾邏輯
- [ ] `src/app/api/integrations/status/route.ts`: 回報 `github: isGitHubConfigured()`
- **驗證**: `/api/integrations/status` 回傳 github 狀態

## Task 4: System Prompt
- [ ] `src/lib/ai/system-prompt.ts`: 加入 GITHUB_INSTRUCTIONS 區塊
  - 可用 actions 說明 + 參數範例
  - 策略：先 listRepos 找到 repo → 再查 PR / commits / code
  - searchCode 注意事項（rate limit 較低）
- [ ] 更新 system-prompt.test.ts 加入測試
- **驗證**: 選擇 GitHub 資料來源時，system prompt 包含指南

## Task 5: UI Integration
- [ ] `src/components/data-source-selector.tsx`:「團隊協作」子選單加入 GitHub 選項（Github icon）
- [ ] `src/components/tool-call-display.tsx`: 加入 githubQuery 的圖示和標籤
- [ ] 更新 i18n（en.json, zh-TW.json）：github name/description 已存在，確認即可
- [ ] `.env.example`: 加入 `GITHUB_TOKEN`
- **驗證**: UI 中可以選擇/取消 GitHub，狀態正確顯示

## Dependencies
- Task 1 → Task 2（tools 依賴 client）
- Task 2 → Task 3（route 依賴 tools）
- Task 1 → Task 3（status route 依賴 client）
- Task 4、Task 5 可與 Task 2 平行
