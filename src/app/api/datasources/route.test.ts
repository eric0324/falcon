import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockGetAccessibleDataSources = vi.hoisted(() => vi.fn());

vi.mock("next-auth", () => ({ getServerSession: mockGetServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/permissions", () => ({
  getAccessibleDataSources: mockGetAccessibleDataSources,
}));

import { GET } from "./route";

const mockSession = {
  user: { id: "user-1", email: "test@company.com", department: "engineering" },
};

describe("GET /api/datasources", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not logged in", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns accessible data sources", async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockGetAccessibleDataSources.mockResolvedValue([
      {
        dataSource: {
          name: "db-main",
          displayName: "Main DB",
          type: "POSTGRES",
          description: "Primary database",
        },
        allowedTables: ["users"],
      },
      {
        dataSource: {
          name: "api-hr",
          displayName: "HR API",
          type: "REST_API",
          description: "HR service",
        },
        allowedTables: [],
      },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].name).toBe("db-main");
    expect(body[1].name).toBe("api-hr");
  });

  it("returns empty array when no sources accessible", async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockGetAccessibleDataSources.mockResolvedValue([]);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });
});
