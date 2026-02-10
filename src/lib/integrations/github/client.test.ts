import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function setEnv(token: string) {
  process.env.GITHUB_TOKEN = token;
}

function clearEnv() {
  delete process.env.GITHUB_TOKEN;
}

async function importClient() {
  return await import("./client");
}

describe("isGitHubConfigured", () => {
  beforeEach(() => {
    clearEnv();
    vi.resetModules();
    mockFetch.mockReset();
  });

  it("returns true when GITHUB_TOKEN is set", async () => {
    setEnv("ghp_test123");
    const { isGitHubConfigured } = await importClient();
    expect(isGitHubConfigured()).toBe(true);
  });

  it("returns false when GITHUB_TOKEN is missing", async () => {
    clearEnv();
    const { isGitHubConfigured } = await importClient();
    expect(isGitHubConfigured()).toBe(false);
  });

  it("returns false when GITHUB_TOKEN is empty", async () => {
    setEnv("");
    const { isGitHubConfigured } = await importClient();
    expect(isGitHubConfigured()).toBe(false);
  });
});

describe("listRepos", () => {
  beforeEach(() => {
    clearEnv();
    vi.resetModules();
    mockFetch.mockReset();
    setEnv("ghp_test123");
  });

  it("fetches user repos sorted by pushed", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          name: "falcon",
          full_name: "myorg/falcon",
          description: "AI platform",
          language: "TypeScript",
          updated_at: "2026-02-09T10:00:00Z",
          visibility: "private",
          open_issues_count: 3,
          html_url: "https://github.com/myorg/falcon",
        },
        {
          name: "api-server",
          full_name: "myorg/api-server",
          description: "Backend API",
          language: "Go",
          updated_at: "2026-02-08T10:00:00Z",
          visibility: "private",
          open_issues_count: 1,
          html_url: "https://github.com/myorg/api-server",
        },
      ],
    });

    const { listRepos } = await importClient();
    const result = await listRepos();

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("falcon");
    expect(result[0].fullName).toBe("myorg/falcon");
    expect(result[0].language).toBe("TypeScript");

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/user/repos");
    expect(calledUrl).toContain("sort=pushed");
    expect(calledUrl).toContain("per_page=20");
  });

  it("fetches org repos when org is specified", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { listRepos } = await importClient();
    await listRepos("myorg");

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/orgs/myorg/repos");
  });

  it("respects limit parameter", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { listRepos } = await importClient();
    await listRepos(undefined, 5);

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("per_page=5");
  });

  it("throws on API error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({ message: "Bad credentials" }),
    });

    const { listRepos } = await importClient();
    await expect(listRepos()).rejects.toThrow("GitHub API error");
  });
});

describe("listPullRequests", () => {
  beforeEach(() => {
    clearEnv();
    vi.resetModules();
    mockFetch.mockReset();
    setEnv("ghp_test123");
  });

  it("fetches open PRs by default", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          number: 42,
          title: "Add login feature",
          user: { login: "alice" },
          state: "open",
          created_at: "2026-02-01T10:00:00Z",
          updated_at: "2026-02-09T10:00:00Z",
          draft: false,
          labels: [{ name: "feature" }],
          html_url: "https://github.com/myorg/falcon/pull/42",
        },
      ],
    });

    const { listPullRequests } = await importClient();
    const result = await listPullRequests("myorg/falcon");

    expect(result).toHaveLength(1);
    expect(result[0].number).toBe(42);
    expect(result[0].title).toBe("Add login feature");
    expect(result[0].author).toBe("alice");
    expect(result[0].draft).toBe(false);
    expect(result[0].labels).toEqual(["feature"]);

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/repos/myorg/falcon/pulls");
    expect(calledUrl).toContain("state=open");
  });

  it("supports state filter", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { listPullRequests } = await importClient();
    await listPullRequests("myorg/falcon", "closed");

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("state=closed");
  });

  it("supports limit parameter", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { listPullRequests } = await importClient();
    await listPullRequests("myorg/falcon", undefined, 5);

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("per_page=5");
  });
});

describe("getPullRequest", () => {
  beforeEach(() => {
    clearEnv();
    vi.resetModules();
    mockFetch.mockReset();
    setEnv("ghp_test123");
  });

  it("fetches PR details with files and reviews", async () => {
    // PR details
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        number: 42,
        title: "Add login feature",
        body: "Implements OAuth login",
        user: { login: "alice" },
        state: "open",
        created_at: "2026-02-01T10:00:00Z",
        merged: false,
        additions: 150,
        deletions: 20,
        changed_files: 5,
        html_url: "https://github.com/myorg/falcon/pull/42",
      }),
    });
    // PR files
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          filename: "src/auth.ts",
          status: "added",
          additions: 100,
          deletions: 0,
          patch: "@ -0,0 +1,100 @@\n+export function login() {}",
        },
      ],
    });
    // PR reviews
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          user: { login: "bob" },
          state: "APPROVED",
          body: "Looks good!",
        },
      ],
    });

    const { getPullRequest } = await importClient();
    const result = await getPullRequest("myorg/falcon", 42);

    expect(result.title).toBe("Add login feature");
    expect(result.body).toBe("Implements OAuth login");
    expect(result.author).toBe("alice");
    expect(result.additions).toBe(150);
    expect(result.deletions).toBe(20);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].filename).toBe("src/auth.ts");
    expect(result.reviews).toHaveLength(1);
    expect(result.reviews[0].author).toBe("bob");
    expect(result.reviews[0].state).toBe("APPROVED");
  });

  it("truncates long patches to 500 chars", async () => {
    const longPatch = "x".repeat(1000);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        number: 1, title: "t", body: "", user: { login: "a" },
        state: "open", created_at: "", merged: false,
        additions: 0, deletions: 0, changed_files: 1,
        html_url: "",
      }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { filename: "big.ts", status: "modified", additions: 500, deletions: 0, patch: longPatch },
      ],
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { getPullRequest } = await importClient();
    const result = await getPullRequest("myorg/falcon", 1);

    expect(result.files[0].patch.length).toBeLessThanOrEqual(520); // 500 + "... (truncated)"
    expect(result.files[0].patch).toContain("(truncated)");
  });

  it("limits files to 20 and adds hint", async () => {
    const manyFiles = Array.from({ length: 25 }, (_, i) => ({
      filename: `file${i}.ts`,
      status: "modified",
      additions: 1,
      deletions: 0,
      patch: "+line",
    }));

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        number: 1, title: "t", body: "", user: { login: "a" },
        state: "open", created_at: "", merged: false,
        additions: 25, deletions: 0, changed_files: 25,
        html_url: "",
      }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => manyFiles,
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { getPullRequest } = await importClient();
    const result = await getPullRequest("myorg/falcon", 1);

    expect(result.files).toHaveLength(20);
    expect(result.totalFiles).toBe(25);
  });
});

describe("searchCode", () => {
  beforeEach(() => {
    clearEnv();
    vi.resetModules();
    mockFetch.mockReset();
    setEnv("ghp_test123");
  });

  it("searches code across repos", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        total_count: 2,
        items: [
          {
            name: "payment.ts",
            path: "src/payment.ts",
            repository: { full_name: "myorg/api-server" },
            html_url: "https://github.com/myorg/api-server/blob/main/src/payment.ts",
            text_matches: [
              { fragment: "export function handlePayment() {" },
            ],
          },
        ],
      }),
    });

    const { searchCode } = await importClient();
    const result = await searchCode("handlePayment");

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("src/payment.ts");
    expect(result[0].repo).toBe("myorg/api-server");
    expect(result[0].textMatches).toHaveLength(1);

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/search/code");
    expect(calledUrl).toContain("q=handlePayment");
  });

  it("adds repo qualifier when repo is specified", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ total_count: 0, items: [] }),
    });

    const { searchCode } = await importClient();
    await searchCode("config", "myorg/falcon");

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("q=config%2Brepo%3Amyorg%2Ffalcon");
  });

  it("respects limit parameter", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ total_count: 0, items: [] }),
    });

    const { searchCode } = await importClient();
    await searchCode("test", undefined, 5);

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("per_page=5");
  });

  it("includes text-match accept header", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ total_count: 0, items: [] }),
    });

    const { searchCode } = await importClient();
    await searchCode("test");

    const headers = mockFetch.mock.calls[0][1]?.headers;
    expect(headers).toHaveProperty("Accept");
    expect(headers.Accept).toContain("text-match");
  });
});

describe("listCommits", () => {
  beforeEach(() => {
    clearEnv();
    vi.resetModules();
    mockFetch.mockReset();
    setEnv("ghp_test123");
  });

  it("fetches recent commits", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          sha: "abc1234567890",
          commit: {
            message: "feat: add login\n\nDetailed description",
            author: { name: "Alice", date: "2026-02-09T10:00:00Z" },
          },
          html_url: "https://github.com/myorg/falcon/commit/abc1234",
          stats: { additions: 50, deletions: 10 },
        },
      ],
    });

    const { listCommits } = await importClient();
    const result = await listCommits("myorg/falcon");

    expect(result).toHaveLength(1);
    expect(result[0].sha).toBe("abc1234");
    expect(result[0].message).toBe("feat: add login");
    expect(result[0].author).toBe("Alice");

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/repos/myorg/falcon/commits");
    expect(calledUrl).toContain("per_page=20");
  });

  it("supports branch parameter", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { listCommits } = await importClient();
    await listCommits("myorg/falcon", "develop");

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("sha=develop");
  });

  it("supports limit parameter", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { listCommits } = await importClient();
    await listCommits("myorg/falcon", undefined, 5);

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("per_page=5");
  });
});
