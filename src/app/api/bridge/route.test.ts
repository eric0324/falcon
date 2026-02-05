import { describe, it, expect, vi, beforeEach } from "vitest";

// Setup mocks with vi.hoisted
const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockExecute = vi.hoisted(() => vi.fn());
const mockGetConnectorManager = vi.hoisted(() =>
  vi.fn(() => ({ execute: mockExecute }))
);

vi.mock("next-auth", () => ({ getServerSession: mockGetServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/connectors/manager", () => ({
  getConnectorManager: mockGetConnectorManager,
}));
vi.mock("@/lib/connectors/registry", () => ({
  initializeBuiltinConnectors: vi.fn(),
}));

import { POST } from "./route";

const mockSession = {
  user: { id: "user-1", email: "test@company.com", department: "engineering" },
};

function setLoggedIn() {
  mockGetServerSession.mockResolvedValue(mockSession);
}

function setLoggedOut() {
  mockGetServerSession.mockResolvedValue(null);
}

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/bridge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/bridge", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("Authentication", () => {
    it("returns 401 when not logged in", async () => {
      setLoggedOut();
      const req = createRequest({ dataSourceId: "ds-1", operation: "query", sql: "SELECT 1" });
      const res = await POST(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("returns 401 when user has no id", async () => {
      mockGetServerSession.mockResolvedValue({ user: { email: "test@company.com" } });
      const req = createRequest({ dataSourceId: "ds-1", operation: "query", sql: "SELECT 1" });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });
  });

  describe("Validation", () => {
    beforeEach(() => setLoggedIn());

    it("returns 400 when dataSourceId is missing", async () => {
      const req = createRequest({ operation: "query", sql: "SELECT 1" });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("dataSourceId");
    });

    it("returns 400 when operation is missing", async () => {
      const req = createRequest({ dataSourceId: "ds-1", sql: "SELECT 1" });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("operation");
    });

    it("returns 400 for invalid operation", async () => {
      const req = createRequest({ dataSourceId: "ds-1", operation: "invalid" });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Invalid operation");
    });

    it("returns 400 when sql is missing for query operation", async () => {
      const req = createRequest({ dataSourceId: "ds-1", operation: "query" });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("sql");
    });

    it("returns 400 when resource is missing for create operation", async () => {
      const req = createRequest({
        dataSourceId: "ds-1",
        operation: "create",
        data: { name: "test" },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("resource");
    });

    it("returns 400 when resource is missing for update operation", async () => {
      const req = createRequest({
        dataSourceId: "ds-1",
        operation: "update",
        data: { name: "test" },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("resource");
    });

    it("returns 400 when resource is missing for delete operation", async () => {
      const req = createRequest({
        dataSourceId: "ds-1",
        operation: "delete",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("resource");
    });

    it("returns 400 when data is missing for create operation", async () => {
      const req = createRequest({
        dataSourceId: "ds-1",
        operation: "create",
        resource: "users",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("data");
    });

    it("returns 400 when data is missing for update operation", async () => {
      const req = createRequest({
        dataSourceId: "ds-1",
        operation: "update",
        resource: "users",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("data");
    });
  });

  describe("Execution", () => {
    beforeEach(() => setLoggedIn());

    it("executes query operation successfully", async () => {
      mockExecute.mockResolvedValue({
        success: true,
        data: [{ id: 1, name: "Alice" }],
        rowCount: 1,
        duration: 50,
      });

      const req = createRequest({
        dataSourceId: "ds-1",
        operation: "query",
        sql: "SELECT * FROM users",
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toEqual([{ id: 1, name: "Alice" }]);
      expect(body.rowCount).toBe(1);
    });

    it("passes correct params to manager.execute", async () => {
      mockExecute.mockResolvedValue({ success: true, data: [] });

      const req = createRequest({
        dataSourceId: "ds-1",
        operation: "query",
        sql: "SELECT * FROM users WHERE id = $1",
        params: [1],
        toolId: "tool-1",
        timeout: 10000,
      });
      await POST(req);

      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          dataSourceId: "ds-1",
          operation: "query",
          userId: "user-1",
          department: "engineering",
          sql: "SELECT * FROM users WHERE id = $1",
          params: [1],
          toolId: "tool-1",
          timeout: 10000,
        })
      );
    });

    it("uses default department when user has none", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user-1", email: "test@company.com" },
      });
      mockExecute.mockResolvedValue({ success: true, data: [] });

      const req = createRequest({
        dataSourceId: "ds-1",
        operation: "list",
      });
      await POST(req);

      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          department: "default",
        })
      );
    });

    it("executes list operation successfully", async () => {
      mockExecute.mockResolvedValue({
        success: true,
        data: [{ table_name: "users" }, { table_name: "orders" }],
        rowCount: 2,
      });

      const req = createRequest({
        dataSourceId: "ds-1",
        operation: "list",
        resource: "tables",
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(2);
    });

    it("executes create operation successfully", async () => {
      mockExecute.mockResolvedValue({
        success: true,
        data: { id: 1, name: "New User" },
        rowCount: 1,
      });

      const req = createRequest({
        dataSourceId: "ds-1",
        operation: "create",
        resource: "users",
        data: { name: "New User" },
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toEqual({ id: 1, name: "New User" });
    });

    it("executes update operation successfully", async () => {
      mockExecute.mockResolvedValue({
        success: true,
        data: { id: 1, name: "Updated" },
        rowCount: 1,
      });

      const req = createRequest({
        dataSourceId: "ds-1",
        operation: "update",
        resource: "users",
        data: { name: "Updated" },
        where: { id: 1 },
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it("executes delete operation successfully", async () => {
      mockExecute.mockResolvedValue({
        success: true,
        rowCount: 1,
      });

      const req = createRequest({
        dataSourceId: "ds-1",
        operation: "delete",
        resource: "users",
        where: { id: 1 },
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it("returns 400 when execution fails", async () => {
      mockExecute.mockResolvedValue({
        success: false,
        error: "Permission denied",
        duration: 10,
      });

      const req = createRequest({
        dataSourceId: "ds-1",
        operation: "query",
        sql: "SELECT * FROM secrets",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("Permission denied");
    });

    it("returns 500 on unexpected error", async () => {
      mockExecute.mockRejectedValue(new Error("Database connection failed"));

      const req = createRequest({
        dataSourceId: "ds-1",
        operation: "query",
        sql: "SELECT 1",
      });
      const res = await POST(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("Database connection failed");
    });
  });
});
