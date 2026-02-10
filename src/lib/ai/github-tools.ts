import { tool } from "ai";
import { z } from "zod";
import {
  isGitHubConfigured,
  listRepos,
  listPullRequests,
  getPullRequest,
  searchCode,
  listCommits,
} from "@/lib/integrations/github";

export function createGitHubTools() {
  return {
    githubQuery: tool({
      description: `Query GitHub repositories, pull requests, commits, and code (read-only). Actions:
- listRepos: list accessible repositories (sorted by recent activity)
- listPRs: list pull requests for a repo (default: open)
- readPR: read PR details including diff and reviews
- searchCode: search code across repos (returns code fragments)
- commits: view recent commit history`,
      inputSchema: z.object({
        action: z.enum(["listRepos", "listPRs", "readPR", "searchCode", "commits"])
          .describe("listRepos: browse repos, listPRs: pull requests, readPR: PR detail+diff, searchCode: find code, commits: history"),
        repo: z.string().optional()
          .describe("Repository full name (e.g. owner/repo). Required for listPRs, readPR, commits."),
        org: z.string().optional()
          .describe("Organization name to filter repos (for listRepos)"),
        prNumber: z.number().optional()
          .describe("Pull request number (for readPR)"),
        search: z.string().optional()
          .describe("Search query (for searchCode)"),
        branch: z.string().optional()
          .describe("Branch name (for commits)"),
        state: z.string().optional()
          .describe("PR state filter: open, closed, all (for listPRs, default: open)"),
        limit: z.number().optional()
          .describe("Max results (default: 20 for most, 10 for searchCode)"),
      }),
      execute: async (params) => {
        try {
          if (!isGitHubConfigured()) {
            return {
              success: false,
              error: "GitHub is not configured.",
              needsConnection: true,
              service: "github",
            };
          }

          switch (params.action) {
            case "listRepos": {
              const data = await listRepos(params.org, params.limit || 20);
              return {
                success: true,
                service: "github",
                data,
                rowCount: data.length,
                hint: "Use listPRs with a repo name to see pull requests, or commits to see history.",
              };
            }

            case "listPRs": {
              if (!params.repo) {
                return {
                  success: false,
                  error: "repo is required for listPRs. Use listRepos first to find available repos.",
                  service: "github",
                };
              }
              const data = await listPullRequests(
                params.repo,
                params.state || "open",
                params.limit || 20,
              );
              return {
                success: true,
                service: "github",
                data,
                rowCount: data.length,
                hint: "Use readPR with a PR number to see details, diff, and reviews.",
              };
            }

            case "readPR": {
              if (!params.repo || !params.prNumber) {
                return {
                  success: false,
                  error: "repo and prNumber are required for readPR.",
                  service: "github",
                };
              }
              const data = await getPullRequest(params.repo, params.prNumber);
              return {
                success: true,
                service: "github",
                data,
              };
            }

            case "searchCode": {
              if (!params.search) {
                return {
                  success: false,
                  error: "search query is required for searchCode.",
                  service: "github",
                };
              }
              const data = await searchCode(
                params.search,
                params.repo,
                params.limit || 10,
              );
              return {
                success: true,
                service: "github",
                data,
                rowCount: data.length,
                hint: "Results include code fragments showing where the match was found.",
              };
            }

            case "commits": {
              if (!params.repo) {
                return {
                  success: false,
                  error: "repo is required for commits. Use listRepos first to find available repos.",
                  service: "github",
                };
              }
              const data = await listCommits(
                params.repo,
                params.branch,
                params.limit || 20,
              );
              return {
                success: true,
                service: "github",
                data,
                rowCount: data.length,
              };
            }
          }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            service: "github",
          };
        }
      },
    }),
  };
}
