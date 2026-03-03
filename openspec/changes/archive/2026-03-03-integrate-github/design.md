# integrate-github: Design

## Architecture

```
環境變數 (GITHUB_TOKEN)
    ↓
Client 層 (src/lib/integrations/github/)
    - isGitHubConfigured()
    - listRepos(org?, sort?, limit?)         → 列出可存取的 repo
    - listPullRequests(repo, state?, limit?) → 列出 PR
    - getPullRequest(repo, prNumber)         → PR 詳情 + diff + reviews
    - searchCode(query, repo?, limit?)       → 搜尋程式碼
    - listCommits(repo, branch?, limit?)     → commit 記錄
    ↓
Tools 層 (src/lib/ai/github-tools.ts)
    - createGitHubTools()
    - 單一工具 githubQuery（action 模式）
    ↓
Route 層
    - chat/route.ts: 註冊 githubTools
    - integrations/status/route.ts: 回報 github 狀態
    ↓
UI 層
    - data-source-selector.tsx:「團隊協作」子選單加入 GitHub
    - system-prompt.ts: 加入 GitHub 使用指南
```

## Tool Design

單一工具 + action 模式：

```
githubQuery({ action: "listRepos" })
  → [{ name, fullName, description, language, updatedAt, openIssuesCount, visibility }]

githubQuery({ action: "listRepos", org: "mycompany" })
  → 篩選特定 org 的 repo

githubQuery({ action: "listPRs", repo: "owner/repo", state: "open" })
  → [{ number, title, author, state, createdAt, updatedAt, reviewDecision, labels, draft }]

githubQuery({ action: "readPR", repo: "owner/repo", prNumber: 123 })
  → { title, body, author, state, files: [{ filename, status, additions, deletions, patch }], reviews: [{ author, state, body }] }

githubQuery({ action: "searchCode", search: "handlePayment", repo: "owner/repo" })
  → [{ repo, path, url, textMatches }]

githubQuery({ action: "commits", repo: "owner/repo", branch: "main", limit: 10 })
  → [{ sha, message, author, date, additions, deletions }]
```

## API Endpoints

| Action | Endpoint | Method |
|--------|----------|--------|
| listRepos | `/user/repos` 或 `/orgs/{org}/repos` | GET |
| listPRs | `/repos/{owner}/{repo}/pulls` | GET |
| readPR | `/repos/{owner}/{repo}/pulls/{number}` | GET |
| readPR (files) | `/repos/{owner}/{repo}/pulls/{number}/files` | GET |
| readPR (reviews) | `/repos/{owner}/{repo}/pulls/{number}/reviews` | GET |
| searchCode | `/search/code?q={query}` | GET |
| commits | `/repos/{owner}/{repo}/commits` | GET |

## listRepos 策略

GitHub token 可能有存取多 org 的權限，repos 可能很多。策略：

1. 預設呼叫 `/user/repos?sort=pushed&per_page={limit}`（按最近活動排序）
2. 若指定 `org`，改呼叫 `/orgs/{org}/repos`
3. 預設 limit 20，避免回傳太多

## readPR 策略

一次 readPR 需要打 3 個 API：
1. PR 基本資訊（title, body, state, author）
2. Changed files（filename, status, additions, deletions, patch）
3. Reviews（author, state, body）

Patch（diff）可能很長，需截斷策略：
- 每個檔案的 patch 最多保留前 500 字元
- 超過 20 個檔案時只回傳前 20 個 + 提示還有更多
- 回傳 `totalChanges` 讓 AI 知道完整變更量

## searchCode 策略

GitHub Search API 有特殊限制：
- Rate limit：30 requests/minute（比一般 API 低很多）
- 只搜尋預設分支
- query 格式：`{keyword}+repo:{owner/repo}` 或 `{keyword}+org:{org}`
- 回傳 `text_matches` 需加 header `Accept: application/vnd.github.text-match+json`

策略：
- 若指定 repo，自動加上 `repo:` qualifier
- 預設 limit 10（搜尋結果通常不需要太多）
- 回傳 text_matches 中的 fragment（程式碼片段 + 高亮位置）

## 回傳資料精簡

所有回傳都做精簡處理，只保留 AI 需要的欄位：
- repo：name, fullName, description, language, updatedAt, visibility
- PR：number, title, author (login), state, createdAt, labels, draft, reviewDecision
- commit：sha (前 7 碼), message (第一行), author, date
- file：filename, status, additions, deletions, patch (截斷)

## Configuration

| 環境變數 | 必填 | 說明 |
|---------|------|------|
| `GITHUB_TOKEN` | Yes | Personal Access Token（classic 或 fine-grained） |

## Decisions

1. **使用 fetch 而非 octokit**：只做讀取，octokit 太重，直接 fetch + JSON 更輕量。
2. **不存 org/repo 在環境變數**：讓 AI 透過 listRepos 動態發現，彈性更高。
3. **readPR 合併 3 個 API**：一次呼叫取得完整 PR 資訊（基本 + diff + reviews），減少 AI 多次來回。
4. **Patch 截斷策略**：避免大 PR 的 diff 塞爆 context window，截斷但保留檔案清單。
5. **searchCode 特殊 Accept header**：取得 text_matches 提供程式碼片段上下文。
