import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetServerSession = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  tool: { findUnique: vi.fn() },
  dataSource: { findUnique: vi.fn() },
  apiLog: { create: vi.fn() },
}));
const mockResolvePermission = vi.hoisted(() => vi.fn());
const mockCheckToolAuthorization = vi.hoisted(() => vi.fn());
const mockGetAccessibleDataSources = vi.hoisted(() => vi.fn());
const mockExecutePostgresQuery = vi.hoisted(() => vi.fn());
const mockExecuteMySQLQuery = vi.hoisted(() => vi.fn());
const mockExecuteRestApiCall = vi.hoisted(() => vi.fn());

vi.mock("next-auth", () => ({ getServerSession: mockGetServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/permissions", () => ({
  resolvePermission: mockResolvePermission,
  checkToolAuthorization: mockCheckToolAuthorization,
  getAccessibleDataSources: mockGetAccessibleDataSources,
}));
vi.mock("@/lib/connectors/postgres", () => ({
  executePostgresQuery: mockExecutePostgresQuery,
}));
vi.mock("@/lib/connectors/mysql", () => ({
  executeMySQLQuery: mockExecuteMySQLQuery,
}));
vi.mock("@/lib/connectors/rest-api", () => ({
  executeRestApiCall: mockExecuteRestApiCall,
}));

import { POST } from "./route";

const mockSession = {
  user: { id: "user-1", email: "test@company.com", department: "engineering" },
};

function makeRequest(body: object) {
  return new NextRequest("http://localhost/api/bridge", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/bridge", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not logged in", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(makeRequest({ toolId: "t1", operation: "getSources" }));
    expect(res.status).toBe(401);
  });

  it("returns 404 when tool not found", async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    prismaMock.tool.findUnique.mockResolvedValue(null);
    const res = await POST(makeRequest({ toolId: "t1", operation: "getSources" }));
    expect(res.status).toBe(404);
  });

  describe("getSources operation", () => {
    it("returns accessible data sources", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      prismaMock.tool.findUnique.mockResolvedValue({
        id: "t1",
        allowedSources: [],
        authorId: "user-1",
        visibility: "PRIVATE",
      });
      mockGetAccessibleDataSources.mockResolvedValue([
        {
          dataSource: {
            name: "db-main",
            displayName: "Main DB",
            type: "POSTGRES",
            description: "Primary DB",
          },
          allowedTables: ["users"],
        },
      ]);

      const res = await POST(makeRequest({ toolId: "t1", operation: "getSources" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].name).toBe("db-main");
    });
  });

  it("returns 400 when source is missing for query/call operations", async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    prismaMock.tool.findUnique.mockResolvedValue({
      id: "t1",
      allowedSources: [],
      authorId: "user-1",
    });
    const res = await POST(
      makeRequest({ toolId: "t1", operation: "query", sql: "SELECT 1" })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Data source is required");
  });

  it("returns 400 for unknown operation", async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    prismaMock.tool.findUnique.mockResolvedValue({
      id: "t1",
      allowedSources: [],
      authorId: "user-1",
    });
    mockResolvePermission.mockResolvedValue({
      dataSource: { id: "ds-1", type: "POSTGRES", config: {} },
      allowedTables: ["users"],
      blockedColumns: [],
      canRead: true,
    });

    const res = await POST(
      makeRequest({ toolId: "t1", operation: "invalid" as any, source: "db-main" })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Unknown operation");
  });

  describe("query operation", () => {
    it("returns 403 when tool not authorized for source", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      prismaMock.tool.findUnique.mockResolvedValue({
        id: "t1",
        allowedSources: ["db-main"],
        authorId: "user-1",
      });
      mockCheckToolAuthorization.mockReturnValue(false);

      const res = await POST(
        makeRequest({
          toolId: "t1",
          operation: "query",
          source: "db-secret",
          sql: "SELECT * FROM users",
        })
      );
      expect(res.status).toBe(403);
    });

    it("returns 403 when user has no permission", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      prismaMock.tool.findUnique.mockResolvedValue({
        id: "t1",
        allowedSources: [],
        authorId: "user-1",
      });
      mockResolvePermission.mockResolvedValue(null);

      const res = await POST(
        makeRequest({
          toolId: "t1",
          operation: "query",
          source: "db-main",
          sql: "SELECT * FROM users",
        })
      );
      expect(res.status).toBe(403);
    });

    it("returns 400 when SQL is missing", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      prismaMock.tool.findUnique.mockResolvedValue({
        id: "t1",
        allowedSources: [],
        authorId: "user-1",
      });
      mockResolvePermission.mockResolvedValue({
        dataSource: { id: "ds-1", type: "POSTGRES", config: {} },
        allowedTables: ["users"],
        blockedColumns: [],
        canRead: true,
      });

      const res = await POST(
        makeRequest({ toolId: "t1", operation: "query", source: "db-main" })
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("SQL query is required");
    });

    it("returns 400 for non-database data source type", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      prismaMock.tool.findUnique.mockResolvedValue({
        id: "t1",
        allowedSources: [],
        authorId: "user-1",
      });
      mockResolvePermission.mockResolvedValue({
        dataSource: { id: "ds-1", type: "REST_API", config: {} },
        allowedTables: [],
        blockedColumns: [],
        canRead: true,
      });

      const res = await POST(
        makeRequest({
          toolId: "t1",
          operation: "query",
          source: "api-hr",
          sql: "SELECT 1",
        })
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("does not support queries");
    });

    it("executes postgres query successfully", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      prismaMock.tool.findUnique.mockResolvedValue({
        id: "t1",
        allowedSources: [],
        authorId: "user-1",
      });
      mockResolvePermission.mockResolvedValue({
        dataSource: { id: "ds-1", type: "POSTGRES", config: {}, allowedEndpoints: [] },
        allowedTables: ["users"],
        blockedColumns: [],
        canRead: true,
      });
      mockExecutePostgresQuery.mockResolvedValue({
        rows: [{ id: 1 }],
        rowCount: 1,
      });
      prismaMock.apiLog.create.mockResolvedValue({});

      const res = await POST(
        makeRequest({
          toolId: "t1",
          operation: "query",
          source: "db-main",
          sql: "SELECT * FROM users",
        })
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toEqual([{ id: 1 }]);
    });

    it("executes mysql query successfully", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      prismaMock.tool.findUnique.mockResolvedValue({
        id: "t1",
        allowedSources: [],
        authorId: "user-1",
      });
      mockResolvePermission.mockResolvedValue({
        dataSource: { id: "ds-1", type: "MYSQL", config: {}, allowedEndpoints: [] },
        allowedTables: ["users"],
        blockedColumns: [],
        canRead: true,
      });
      mockExecuteMySQLQuery.mockResolvedValue({
        rows: [{ id: 1, name: "Bob" }],
        rowCount: 1,
      });
      prismaMock.apiLog.create.mockResolvedValue({});

      const res = await POST(
        makeRequest({
          toolId: "t1",
          operation: "query",
          source: "db-mysql",
          sql: "SELECT * FROM users",
        })
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toEqual([{ id: 1, name: "Bob" }]);
      expect(mockExecuteMySQLQuery).toHaveBeenCalled();
    });
  });

  describe("call operation", () => {
    it("returns 400 when endpoint is missing", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      prismaMock.tool.findUnique.mockResolvedValue({
        id: "t1",
        allowedSources: [],
        authorId: "user-1",
      });
      mockResolvePermission.mockResolvedValue({
        dataSource: { id: "ds-1", type: "REST_API", config: {}, allowedEndpoints: ["users"] },
        allowedTables: [],
        blockedColumns: [],
        canRead: true,
      });

      const res = await POST(
        makeRequest({ toolId: "t1", operation: "call", source: "api-hr" })
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("API endpoint is required");
    });

    it("returns 400 for non-REST_API data source", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      prismaMock.tool.findUnique.mockResolvedValue({
        id: "t1",
        allowedSources: [],
        authorId: "user-1",
      });
      mockResolvePermission.mockResolvedValue({
        dataSource: { id: "ds-1", type: "POSTGRES", config: {}, allowedEndpoints: [] },
        allowedTables: ["users"],
        blockedColumns: [],
        canRead: true,
      });

      const res = await POST(
        makeRequest({
          toolId: "t1",
          operation: "call",
          source: "db-main",
          endpoint: "users",
        })
      );
      expect(res.status).toBe(400);
    });

    it("executes REST API call successfully", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      prismaMock.tool.findUnique.mockResolvedValue({
        id: "t1",
        allowedSources: [],
        authorId: "user-1",
      });
      mockResolvePermission.mockResolvedValue({
        dataSource: {
          id: "ds-1",
          type: "REST_API",
          config: { baseUrl: "https://api.example.com", headers: {} },
          allowedEndpoints: ["users"],
        },
        allowedTables: [],
        blockedColumns: [],
        canRead: true,
      });
      mockExecuteRestApiCall.mockResolvedValue({ users: [] });
      prismaMock.apiLog.create.mockResolvedValue({});

      const res = await POST(
        makeRequest({
          toolId: "t1",
          operation: "call",
          source: "api-hr",
          endpoint: "users",
        })
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toEqual({ users: [] });
    });
  });
});
