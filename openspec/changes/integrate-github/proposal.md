# integrate-github

## Summary
新增 GitHub 唯讀整合，讓 AI 助手能查詢 GitHub.com 上的 repositories、pull requests、commits，以及搜尋程式碼，使用 Personal Access Token 認證。

## Motivation
開發團隊日常需要查詢 repo 狀態、PR 進度、最近的程式碼變更。串接後使用者可在 Falcon 對話中直接用自然語言查詢，例如「哪些 PR 在等 review」、「最近有什麼 commit」、「幫我找某段程式碼在哪」。

## Scope
- **IN**: 列出可存取的 repo、列出 PR（可篩狀態/reviewer）、讀取 PR 詳情（含 diff + review comments）、搜尋程式碼、查看 commit 記錄
- **OUT**: Issue 功能（使用者不使用）、寫入操作（建立 PR/comment/merge）、GitHub Enterprise（自架）、Webhooks/Events、Release 管理

## Approach
比照 Slack / Notion 整合模式（fetch-based，環境變數 token）：

1. **Client 層** (`src/lib/integrations/github/client.ts`)：用 `fetch` 呼叫 GitHub REST API v3
2. **Tools 層** (`src/lib/ai/github-tools.ts`)：AI 工具定義，單一工具 `githubQuery` + action 模式
3. **Route 層**：chat route 註冊工具、status route 回報狀態
4. **UI 層**：「團隊協作」子選單加入 GitHub 選項
5. **System Prompt**：加入 GitHub 使用指南

## Authentication
使用 Personal Access Token (PAT)：

- `GITHUB_TOKEN`：Classic PAT（需 `repo` scope）或 Fine-grained PAT（需 repo read 權限）

取得方式：
1. GitHub.com → Settings → Developer settings → Personal access tokens
2. Classic：勾選 `repo` scope
3. Fine-grained：選擇目標 repo，授予 Contents (read)、Pull requests (read)、Metadata (read) 權限

## API Notes
- GitHub REST API v3，base URL `https://api.github.com`
- Header：`Authorization: Bearer {token}`，`Accept: application/vnd.github+json`，`X-GitHub-Api-Version: 2022-11-28`
- Rate limit：5,000 requests/hour（authenticated）
- 搜尋 API rate limit：30 requests/minute
- Pagination：`per_page` + `page` 或 `Link` header

## Dependencies
- 無新增 npm 套件（使用 Node.js 內建 `fetch`）
