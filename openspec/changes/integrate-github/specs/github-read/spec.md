# GitHub Read Integration

## ADDED Requirements

### Requirement: GitHub Configuration Check
The system SHALL detect whether GitHub is configured.

#### Scenario: Token configured
- **Given** `GITHUB_TOKEN` is set
- **When** the system checks GitHub status
- **Then** it returns `configured: true`

#### Scenario: Token not configured
- **Given** `GITHUB_TOKEN` is not set
- **When** the system checks GitHub status
- **Then** it returns `configured: false`

---

### Requirement: List Repositories
The system SHALL let the AI list accessible repositories.

#### Scenario: List all repos sorted by recent activity
- **Given** GitHub is configured
- **When** the AI calls `githubQuery({ action: "listRepos" })`
- **Then** it returns repos sorted by last push, each with `{ name, fullName, description, language, updatedAt, visibility }`

#### Scenario: List repos filtered by organization
- **Given** GitHub is configured
- **When** the AI calls `githubQuery({ action: "listRepos", org: "mycompany" })`
- **Then** it returns only repos from the specified organization

#### Scenario: GitHub not configured
- **Given** GitHub is not configured
- **When** the AI calls `githubQuery({ action: "listRepos" })`
- **Then** it returns `{ success: false, needsConnection: true }`

---

### Requirement: List Pull Requests
The system SHALL let the AI list pull requests for a repository.

#### Scenario: List open PRs
- **Given** GitHub is configured
- **When** the AI calls `githubQuery({ action: "listPRs", repo: "owner/repo" })`
- **Then** it returns open PRs with `{ number, title, author, state, createdAt, updatedAt, draft, labels }`

#### Scenario: List PRs with state filter
- **Given** GitHub is configured
- **When** the AI calls `githubQuery({ action: "listPRs", repo: "owner/repo", state: "closed" })`
- **Then** it returns only closed PRs

#### Scenario: List PRs with limit
- **Given** GitHub is configured
- **When** the AI calls `githubQuery({ action: "listPRs", repo: "owner/repo", limit: 5 })`
- **Then** it returns at most 5 PRs

---

### Requirement: Read Pull Request Details
The system SHALL let the AI read full PR details including diff and reviews.

#### Scenario: Read PR with diff and reviews
- **Given** GitHub is configured and PR #123 exists
- **When** the AI calls `githubQuery({ action: "readPR", repo: "owner/repo", prNumber: 123 })`
- **Then** it returns `{ title, body, author, state, files: [{ filename, status, additions, deletions, patch }], reviews: [{ author, state, body }] }`

#### Scenario: Large PR patch truncation
- **Given** a PR has files with patches longer than 500 characters
- **When** the AI reads the PR
- **Then** each file's patch is truncated to 500 characters with a truncation indicator

#### Scenario: PR with many files
- **Given** a PR has more than 20 changed files
- **When** the AI reads the PR
- **Then** only the first 20 files are returned with a hint indicating the total count

---

### Requirement: Search Code
The system SHALL let the AI search for code across repositories.

#### Scenario: Search code in a specific repo
- **Given** GitHub is configured
- **When** the AI calls `githubQuery({ action: "searchCode", search: "handlePayment", repo: "owner/repo" })`
- **Then** it returns matching files with `{ repo, path, textMatches }` containing code fragments

#### Scenario: Search code across all accessible repos
- **Given** GitHub is configured
- **When** the AI calls `githubQuery({ action: "searchCode", search: "handlePayment" })`
- **Then** it returns matching files across all accessible repos

#### Scenario: Search with limit
- **Given** GitHub is configured
- **When** the AI calls `githubQuery({ action: "searchCode", search: "config", limit: 5 })`
- **Then** it returns at most 5 results

---

### Requirement: List Commits
The system SHALL let the AI view recent commit history for a repository.

#### Scenario: List recent commits on default branch
- **Given** GitHub is configured
- **When** the AI calls `githubQuery({ action: "commits", repo: "owner/repo" })`
- **Then** it returns recent commits with `{ sha, message, author, date }`

#### Scenario: List commits on a specific branch
- **Given** GitHub is configured
- **When** the AI calls `githubQuery({ action: "commits", repo: "owner/repo", branch: "develop" })`
- **Then** it returns commits from the specified branch

#### Scenario: Commits with limit
- **Given** GitHub is configured
- **When** the AI calls `githubQuery({ action: "commits", repo: "owner/repo", limit: 5 })`
- **Then** it returns at most 5 commits

---

### Requirement: Data Source Selector Integration
The system SHALL display a GitHub option in the "Team Collaboration" sub-menu.

#### Scenario: GitHub appears in selector
- **Given** GitHub is configured
- **When** the user opens the data source selector
- **Then** GitHub appears in the "Team Collaboration" sub-menu and can be selected

#### Scenario: GitHub not configured in selector
- **Given** GitHub is not configured
- **When** the user opens the data source selector
- **Then** GitHub appears with "Not configured" status and cannot be selected

---

### Requirement: Chat Route Tool Registration
The system SHALL dynamically load GitHub tools based on data source selection.

#### Scenario: GitHub selected as data source
- **Given** the user selected GitHub as a data source
- **When** a chat message is sent
- **Then** the chat route includes githubTools in the available tools

#### Scenario: GitHub not selected
- **Given** the user did not select GitHub
- **When** a chat message is sent
- **Then** githubTools is not included

---

### Requirement: System Prompt GitHub Guide
The system SHALL include a GitHub usage guide in the system prompt when GitHub is selected.

#### Scenario: GitHub guide in system prompt
- **Given** the user selected GitHub as a data source
- **When** the system prompt is built
- **Then** it includes GitHub tool usage instructions, available actions, and strategy tips
