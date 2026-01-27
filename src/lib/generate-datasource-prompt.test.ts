import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted for mock function used in vi.mock factory
const { mockGetAccessibleDataSources } = vi.hoisted(() => ({
  mockGetAccessibleDataSources: vi.fn(),
}));

vi.mock("./permissions", () => ({
  getAccessibleDataSources: mockGetAccessibleDataSources,
}));

import { generateDataSourcePrompt } from "./generate-datasource-prompt";

describe("generateDataSourcePrompt", () => {
  beforeEach(() => {
    mockGetAccessibleDataSources.mockReset();
  });

  it("returns empty string when no data sources accessible", async () => {
    mockGetAccessibleDataSources.mockResolvedValue([]);
    const result = await generateDataSourcePrompt("engineering");
    expect(result).toBe("");
  });

  it("generates SQL data source prompt correctly", async () => {
    mockGetAccessibleDataSources.mockResolvedValue([
      {
        dataSource: {
          name: "db-main",
          displayName: "Main Database",
          type: "POSTGRES",
          description: "Primary database",
          schema: {
            users: ["id", "name", "email", "salary"],
            orders: ["id", "user_id", "total"],
          },
          globalBlockedColumns: ["salary"],
          allowedEndpoints: [],
        },
        permission: {
          readBlockedColumns: [],
        },
        allowedTables: ["users", "orders"],
      },
    ]);

    const result = await generateDataSourcePrompt("engineering");

    expect(result).toContain("Main Database");
    expect(result).toContain("`db-main`");
    expect(result).toContain("POSTGRES");
    expect(result).toContain("Primary database");
    expect(result).toContain("`users`");
    expect(result).toContain("`orders`");
    // salary should be filtered out
    expect(result).not.toContain("salary");
    expect(result).toContain("SELECT * FROM users LIMIT 10");
  });

  it("generates REST API data source prompt correctly", async () => {
    mockGetAccessibleDataSources.mockResolvedValue([
      {
        dataSource: {
          name: "api-hr",
          displayName: "HR API",
          type: "REST_API",
          description: "Human Resources API",
          schema: null,
          globalBlockedColumns: [],
          allowedEndpoints: ["employees", "departments"],
        },
        permission: {
          readBlockedColumns: [],
        },
        allowedTables: [],
      },
    ]);

    const result = await generateDataSourcePrompt("engineering");

    expect(result).toContain("HR API");
    expect(result).toContain("REST API");
    expect(result).toContain("`employees`");
    expect(result).toContain("`departments`");
    expect(result).toContain("window.companyAPI.call");
  });

  it("filters by allowedSourceNames", async () => {
    mockGetAccessibleDataSources.mockResolvedValue([
      {
        dataSource: {
          name: "db-main",
          displayName: "Main DB",
          type: "POSTGRES",
          description: null,
          schema: { users: ["id"] },
          globalBlockedColumns: [],
          allowedEndpoints: [],
        },
        permission: { readBlockedColumns: [] },
        allowedTables: ["users"],
      },
      {
        dataSource: {
          name: "db-hr",
          displayName: "HR DB",
          type: "POSTGRES",
          description: null,
          schema: { employees: ["id"] },
          globalBlockedColumns: [],
          allowedEndpoints: [],
        },
        permission: { readBlockedColumns: [] },
        allowedTables: ["employees"],
      },
    ]);

    const result = await generateDataSourcePrompt("engineering", ["db-main"]);

    expect(result).toContain("Main DB");
    expect(result).not.toContain("HR DB");
  });

  it("returns empty string when all sources filtered out by allowedSourceNames", async () => {
    mockGetAccessibleDataSources.mockResolvedValue([
      {
        dataSource: {
          name: "db-main",
          displayName: "Main DB",
          type: "POSTGRES",
          description: null,
          schema: { users: ["id"] },
          globalBlockedColumns: [],
          allowedEndpoints: [],
        },
        permission: { readBlockedColumns: [] },
        allowedTables: ["users"],
      },
    ]);

    const result = await generateDataSourcePrompt("engineering", ["nonexistent"]);
    expect(result).toBe("");
  });

  it("includes blocked columns notice when there are blocked columns", async () => {
    mockGetAccessibleDataSources.mockResolvedValue([
      {
        dataSource: {
          name: "db-main",
          displayName: "Main DB",
          type: "POSTGRES",
          description: null,
          schema: { users: ["id", "name", "salary"] },
          globalBlockedColumns: ["salary"],
          allowedEndpoints: [],
        },
        permission: { readBlockedColumns: [] },
        allowedTables: ["users"],
      },
    ]);

    const result = await generateDataSourcePrompt("engineering");
    expect(result).toContain("某些欄位會根據權限自動過濾");
  });
});
