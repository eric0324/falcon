const GITHUB_API_BASE = "https://api.github.com";

// ===== Types =====

export interface GitHubRepo {
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  updatedAt: string;
  visibility: string;
  openIssuesCount: number;
  url: string;
}

export interface GitHubPR {
  number: number;
  title: string;
  author: string;
  state: string;
  createdAt: string;
  updatedAt: string;
  draft: boolean;
  labels: string[];
  url: string;
}

export interface GitHubPRFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch: string;
}

export interface GitHubReview {
  author: string;
  state: string;
  body: string;
}

export interface GitHubPRDetail {
  number: number;
  title: string;
  body: string;
  author: string;
  state: string;
  createdAt: string;
  merged: boolean;
  additions: number;
  deletions: number;
  totalFiles: number;
  files: GitHubPRFile[];
  reviews: GitHubReview[];
  url: string;
}

export interface GitHubCodeResult {
  name: string;
  path: string;
  repo: string;
  url: string;
  textMatches: { fragment: string }[];
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

// ===== Configuration =====

export function isGitHubConfigured(): boolean {
  return !!process.env.GITHUB_TOKEN;
}

function getToken(): string {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not configured");
  return token;
}

// ===== Helpers =====

const MAX_PATCH_LENGTH = 500;
const MAX_FILES = 20;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function githubFetch<T = any>(
  path: string,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...extraHeaders,
  };

  const url = `${GITHUB_API_BASE}${path}`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = (error as { message?: string })?.message || response.statusText;
    throw new Error(`GitHub API error: ${response.status} ${message}`);
  }

  return response.json() as Promise<T>;
}

function truncatePatch(patch: string | null | undefined): string {
  if (!patch) return "";
  if (patch.length <= MAX_PATCH_LENGTH) return patch;
  return patch.slice(0, MAX_PATCH_LENGTH) + "... (truncated)";
}

// ===== API Functions =====

export async function listRepos(
  org?: string,
  limit: number = 20,
): Promise<GitHubRepo[]> {
  const path = org
    ? `/orgs/${org}/repos?sort=pushed&per_page=${limit}`
    : `/user/repos?sort=pushed&per_page=${limit}`;

  const data = await githubFetch<Record<string, unknown>[]>(path);

  return data.map((repo) => ({
    name: repo.name as string,
    fullName: repo.full_name as string,
    description: (repo.description as string) || null,
    language: (repo.language as string) || null,
    updatedAt: repo.updated_at as string,
    visibility: repo.visibility as string,
    openIssuesCount: (repo.open_issues_count as number) || 0,
    url: repo.html_url as string,
  }));
}

export async function listPullRequests(
  repo: string,
  state: string = "open",
  limit: number = 20,
): Promise<GitHubPR[]> {
  const path = `/repos/${repo}/pulls?state=${state}&sort=updated&direction=desc&per_page=${limit}`;

  const data = await githubFetch<Record<string, unknown>[]>(path);

  return data.map((pr) => ({
    number: pr.number as number,
    title: pr.title as string,
    author: (pr.user as { login: string })?.login || "",
    state: pr.state as string,
    createdAt: pr.created_at as string,
    updatedAt: pr.updated_at as string,
    draft: (pr.draft as boolean) || false,
    labels: ((pr.labels as { name: string }[]) || []).map((l) => l.name),
    url: pr.html_url as string,
  }));
}

export async function getPullRequest(
  repo: string,
  prNumber: number,
): Promise<GitHubPRDetail> {
  const [prData, filesData, reviewsData] = await Promise.all([
    githubFetch<Record<string, unknown>>(`/repos/${repo}/pulls/${prNumber}`),
    githubFetch<Record<string, unknown>[]>(`/repos/${repo}/pulls/${prNumber}/files?per_page=100`),
    githubFetch<Record<string, unknown>[]>(`/repos/${repo}/pulls/${prNumber}/reviews`),
  ]);

  const totalFiles = filesData.length;
  const files = filesData.slice(0, MAX_FILES).map((f) => ({
    filename: f.filename as string,
    status: f.status as string,
    additions: (f.additions as number) || 0,
    deletions: (f.deletions as number) || 0,
    patch: truncatePatch(f.patch as string),
  }));

  const reviews = reviewsData.map((r) => ({
    author: (r.user as { login: string })?.login || "",
    state: r.state as string,
    body: (r.body as string) || "",
  }));

  return {
    number: prData.number as number,
    title: prData.title as string,
    body: (prData.body as string) || "",
    author: (prData.user as { login: string })?.login || "",
    state: prData.state as string,
    createdAt: prData.created_at as string,
    merged: (prData.merged as boolean) || false,
    additions: (prData.additions as number) || 0,
    deletions: (prData.deletions as number) || 0,
    totalFiles,
    files,
    reviews,
    url: (prData.html_url as string) || "",
  };
}

export async function searchCode(
  query: string,
  repo?: string,
  limit: number = 10,
): Promise<GitHubCodeResult[]> {
  const q = repo ? `${query}+repo:${repo}` : query;
  const path = `/search/code?q=${encodeURIComponent(q)}&per_page=${limit}`;

  const data = await githubFetch<{ items: Record<string, unknown>[] }>(
    path,
    { Accept: "application/vnd.github.text-match+json" },
  );

  return (data.items || []).map((item) => ({
    name: item.name as string,
    path: item.path as string,
    repo: (item.repository as { full_name: string })?.full_name || "",
    url: item.html_url as string,
    textMatches: ((item.text_matches as { fragment: string }[]) || []).map((m) => ({
      fragment: m.fragment,
    })),
  }));
}

export async function listCommits(
  repo: string,
  branch?: string,
  limit: number = 20,
): Promise<GitHubCommit[]> {
  let path = `/repos/${repo}/commits?per_page=${limit}`;
  if (branch) path += `&sha=${branch}`;

  const data = await githubFetch<Record<string, unknown>[]>(path);

  return data.map((item) => {
    const commit = item.commit as { message: string; author: { name: string; date: string } };
    return {
      sha: (item.sha as string).slice(0, 7),
      message: commit.message.split("\n")[0],
      author: commit.author.name,
      date: commit.author.date,
      url: item.html_url as string,
    };
  });
}
