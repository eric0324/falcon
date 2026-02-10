import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/integrations/github", () => ({
  isGitHubConfigured: vi.fn(),
  listRepos: vi.fn(),
  listPullRequests: vi.fn(),
  getPullRequest: vi.fn(),
  searchCode: vi.fn(),
  listCommits: vi.fn(),
}));

import {
  isGitHubConfigured,
  listRepos,
  listPullRequests,
  getPullRequest,
  searchCode,
  listCommits,
} from "@/lib/integrations/github";
import { createGitHubTools } from "./github-tools";

const mockIsConfigured = isGitHubConfigured as ReturnType<typeof vi.fn>;
const mockListRepos = listRepos as ReturnType<typeof vi.fn>;
const mockListPRs = listPullRequests as ReturnType<typeof vi.fn>;
const mockGetPR = getPullRequest as ReturnType<typeof vi.fn>;
const mockSearchCode = searchCode as ReturnType<typeof vi.fn>;
const mockListCommits = listCommits as ReturnType<typeof vi.fn>;

const execOpts = { messages: [], toolCallId: "test", abortSignal: undefined as never };

describe("createGitHubTools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns not configured when GitHub is not set up", async () => {
    mockIsConfigured.mockReturnValue(false);
    const tools = createGitHubTools();
    const result = await tools.githubQuery.execute(
      { action: "listRepos" as const },
      execOpts,
    );
    expect(result).toMatchObject({
      success: false,
      needsConnection: true,
      service: "github",
    });
  });

  it("lists repos", async () => {
    mockIsConfigured.mockReturnValue(true);
    mockListRepos.mockResolvedValue([
      { name: "falcon", fullName: "myorg/falcon", language: "TypeScript" },
    ]);

    const tools = createGitHubTools();
    const result = await tools.githubQuery.execute(
      { action: "listRepos" as const },
      execOpts,
    );

    expect(result).toMatchObject({ success: true, service: "github" });
    const data = (result as { data: unknown }).data;
    expect(data).toHaveLength(1);
    expect(mockListRepos).toHaveBeenCalledWith(undefined, 20);
  });

  it("lists repos with org filter", async () => {
    mockIsConfigured.mockReturnValue(true);
    mockListRepos.mockResolvedValue([]);

    const tools = createGitHubTools();
    await tools.githubQuery.execute(
      { action: "listRepos" as const, org: "myorg" },
      execOpts,
    );

    expect(mockListRepos).toHaveBeenCalledWith("myorg", 20);
  });

  it("lists pull requests", async () => {
    mockIsConfigured.mockReturnValue(true);
    mockListPRs.mockResolvedValue([
      { number: 42, title: "Add feature", author: "alice", state: "open" },
    ]);

    const tools = createGitHubTools();
    const result = await tools.githubQuery.execute(
      { action: "listPRs" as const, repo: "myorg/falcon" },
      execOpts,
    );

    expect(result).toMatchObject({ success: true, service: "github" });
    expect(mockListPRs).toHaveBeenCalledWith("myorg/falcon", "open", 20);
  });

  it("lists PRs with state filter", async () => {
    mockIsConfigured.mockReturnValue(true);
    mockListPRs.mockResolvedValue([]);

    const tools = createGitHubTools();
    await tools.githubQuery.execute(
      { action: "listPRs" as const, repo: "myorg/falcon", state: "closed" },
      execOpts,
    );

    expect(mockListPRs).toHaveBeenCalledWith("myorg/falcon", "closed", 20);
  });

  it("reads PR details", async () => {
    mockIsConfigured.mockReturnValue(true);
    mockGetPR.mockResolvedValue({
      number: 42,
      title: "Add feature",
      author: "alice",
      files: [{ filename: "src/a.ts", status: "added" }],
      reviews: [{ author: "bob", state: "APPROVED" }],
    });

    const tools = createGitHubTools();
    const result = await tools.githubQuery.execute(
      { action: "readPR" as const, repo: "myorg/falcon", prNumber: 42 },
      execOpts,
    );

    expect(result).toMatchObject({ success: true, service: "github" });
    expect(mockGetPR).toHaveBeenCalledWith("myorg/falcon", 42);
  });

  it("requires repo and prNumber for readPR", async () => {
    mockIsConfigured.mockReturnValue(true);

    const tools = createGitHubTools();
    const result = await tools.githubQuery.execute(
      { action: "readPR" as const },
      execOpts,
    );

    expect(result).toMatchObject({ success: false });
    expect((result as { error: string }).error).toContain("repo");
  });

  it("searches code", async () => {
    mockIsConfigured.mockReturnValue(true);
    mockSearchCode.mockResolvedValue([
      { path: "src/payment.ts", repo: "myorg/api", textMatches: [] },
    ]);

    const tools = createGitHubTools();
    const result = await tools.githubQuery.execute(
      { action: "searchCode" as const, search: "handlePayment" },
      execOpts,
    );

    expect(result).toMatchObject({ success: true, service: "github" });
    expect(mockSearchCode).toHaveBeenCalledWith("handlePayment", undefined, 10);
  });

  it("searches code in specific repo", async () => {
    mockIsConfigured.mockReturnValue(true);
    mockSearchCode.mockResolvedValue([]);

    const tools = createGitHubTools();
    await tools.githubQuery.execute(
      { action: "searchCode" as const, search: "config", repo: "myorg/falcon" },
      execOpts,
    );

    expect(mockSearchCode).toHaveBeenCalledWith("config", "myorg/falcon", 10);
  });

  it("lists commits", async () => {
    mockIsConfigured.mockReturnValue(true);
    mockListCommits.mockResolvedValue([
      { sha: "abc1234", message: "feat: add login", author: "Alice" },
    ]);

    const tools = createGitHubTools();
    const result = await tools.githubQuery.execute(
      { action: "commits" as const, repo: "myorg/falcon" },
      execOpts,
    );

    expect(result).toMatchObject({ success: true, service: "github" });
    expect(mockListCommits).toHaveBeenCalledWith("myorg/falcon", undefined, 20);
  });

  it("lists commits on specific branch", async () => {
    mockIsConfigured.mockReturnValue(true);
    mockListCommits.mockResolvedValue([]);

    const tools = createGitHubTools();
    await tools.githubQuery.execute(
      { action: "commits" as const, repo: "myorg/falcon", branch: "develop" },
      execOpts,
    );

    expect(mockListCommits).toHaveBeenCalledWith("myorg/falcon", "develop", 20);
  });

  it("handles errors gracefully", async () => {
    mockIsConfigured.mockReturnValue(true);
    mockListRepos.mockRejectedValue(new Error("API failure"));

    const tools = createGitHubTools();
    const result = await tools.githubQuery.execute(
      { action: "listRepos" as const },
      execOpts,
    );

    expect(result).toMatchObject({
      success: false,
      error: "API failure",
      service: "github",
    });
  });
});
