import { describe, it, expect, vi, beforeEach } from "vitest";

// Setup mocks with vi.hoisted
const mockGetServerSession = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  dataSource: {
    findMany: vi.fn(),
  },
}));

vi.mock("next-auth", () => ({ getServerSession: mockGetServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET } from "./route";

const mockSession = {
  user: { id: "user-1", email: "test@company.com", department: "engineering" },
};

function setLoggedIn(department?: string) {
  mockGetServerSession.mockResolvedValue({
    user: { id: "user-1", email: "test@company.com", department },
  });
}

function setLoggedOut() {
  mockGetServerSession.mockResolvedValue(null);
}

describe("GET /api/data-sources", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("Authentication", () => {
    it("returns 401 when not logged in", async () => {
      setLoggedOut();
      const res = await GET();
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("returns 401 when user has no id", async () => {
      mockGetServerSession.mockResolvedValue({ user: { email: "test@company.com" } });
      const res = await GET();
      expect(res.status).toBe(401);
    });
  });

  describe("Data retrieval", () => {
    it("returns empty array when no data sources available", async () => {
      setLoggedIn("engineering");
      prismaMock.dataSource.findMany.mockResolvedValue([]);

      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual([]);
    });

    it("returns data sources with permissions for user department", async () => {
      setLoggedIn("engineering");
      prismaMock.dataSource.findMany.mockResolvedValue([
        {
          id: "ds-1",
          name: "main_db",
          displayName: "Main Database",
          description: "Production database",
          type: "POSTGRES",
          permissions: [
            {
              readTables: ["users", "orders"],
              writeTables: ["orders"],
              deleteTables: [],
            },
          ],
        },
        {
          id: "ds-2",
          name: "analytics_api",
          displayName: "Analytics API",
          description: "REST API for analytics",
          type: "REST_API",
          permissions: [
            {
              readTables: ["metrics", "events"],
              writeTables: [],
              deleteTables: [],
            },
          ],
        },
      ]);

      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body).toHaveLength(2);
      expect(body[0]).toEqual({
        id: "ds-1",
        name: "main_db",
        displayName: "Main Database",
        description: "Production database",
        type: "POSTGRES",
        capabilities: {
          canRead: true,
          canWrite: true,
          canDelete: false,
          readTables: ["users", "orders"],
          writeTables: ["orders"],
          deleteTables: [],
        },
      });
      expect(body[1].capabilities.canRead).toBe(true);
      expect(body[1].capabilities.canWrite).toBe(false);
    });

    it("uses 'default' department when user has none", async () => {
      setLoggedIn(undefined);
      prismaMock.dataSource.findMany.mockResolvedValue([]);

      await GET();

      expect(prismaMock.dataSource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            permissions: {
              some: {
                department: "default",
              },
            },
          }),
        })
      );
    });

    it("only returns active data sources", async () => {
      setLoggedIn("engineering");
      prismaMock.dataSource.findMany.mockResolvedValue([]);

      await GET();

      expect(prismaMock.dataSource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      );
    });

    it("does not expose config in response", async () => {
      setLoggedIn("engineering");
      prismaMock.dataSource.findMany.mockResolvedValue([
        {
          id: "ds-1",
          name: "main_db",
          displayName: "Main Database",
          description: null,
          type: "POSTGRES",
          permissions: [{ readTables: [], writeTables: [], deleteTables: [] }],
        },
      ]);

      const res = await GET();
      const body = await res.json();

      // Should not contain config, password, or other sensitive fields
      expect(body[0]).not.toHaveProperty("config");
      expect(body[0]).not.toHaveProperty("password");
      expect(body[0]).not.toHaveProperty("globalBlockedColumns");
    });

    it("handles data source with no permissions gracefully", async () => {
      setLoggedIn("engineering");
      prismaMock.dataSource.findMany.mockResolvedValue([
        {
          id: "ds-1",
          name: "test_db",
          displayName: "Test DB",
          description: null,
          type: "MYSQL",
          permissions: [], // Empty permissions array
        },
      ]);

      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body[0].capabilities).toEqual({
        canRead: false,
        canWrite: false,
        canDelete: false,
        readTables: [],
        writeTables: [],
        deleteTables: [],
      });
    });
  });

  describe("Error handling", () => {
    it("returns 500 on database error", async () => {
      setLoggedIn("engineering");
      prismaMock.dataSource.findMany.mockRejectedValue(new Error("DB connection failed"));

      const res = await GET();
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("Failed to fetch data sources");
    });
  });
});
