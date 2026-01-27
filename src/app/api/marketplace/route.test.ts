import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetServerSession = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  tool: { findMany: vi.fn(), count: vi.fn() },
  toolStats: { findMany: vi.fn() },
}));

vi.mock("next-auth", () => ({ getServerSession: mockGetServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET } from "./route";

const mockSession = {
  user: { id: "user-1", email: "test@company.com", department: "engineering" },
};

describe("GET /api/marketplace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: logged in user with department
    mockGetServerSession.mockResolvedValue(mockSession);
    prismaMock.user.findUnique.mockResolvedValue({ department: "engineering" });
  });

  it("returns paginated tools", async () => {
    const tools = [
      {
        id: "t1",
        name: "Tool 1",
        description: "desc 1",
        category: "productivity",
        tags: ["test"],
        visibility: "PUBLIC",
        createdAt: new Date(),
        author: { id: "u1", name: "Alice", image: null, department: "engineering" },
        stats: null,
      },
    ];
    prismaMock.tool.findMany.mockResolvedValue(tools);
    prismaMock.tool.count.mockResolvedValue(1);
    prismaMock.toolStats.findMany.mockResolvedValue([]);

    const req = new NextRequest("http://localhost/api/marketplace");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tools).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.hasMore).toBe(false);
  });

  it("sorts by trending (weeklyUsage)", async () => {
    prismaMock.tool.findMany.mockResolvedValue([]);
    prismaMock.tool.count.mockResolvedValue(0);

    const req = new NextRequest("http://localhost/api/marketplace?section=trending");
    await GET(req);

    expect(prismaMock.tool.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ stats: { weeklyUsage: "desc" } }, { createdAt: "desc" }],
      })
    );
  });

  it("sorts by top-rated (weightedRating)", async () => {
    prismaMock.tool.findMany.mockResolvedValue([]);
    prismaMock.tool.count.mockResolvedValue(0);

    const req = new NextRequest("http://localhost/api/marketplace?section=top-rated");
    await GET(req);

    expect(prismaMock.tool.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ stats: { weightedRating: "desc" } }, { createdAt: "desc" }],
      })
    );
  });

  it("sorts by most-used (totalUsage)", async () => {
    prismaMock.tool.findMany.mockResolvedValue([]);
    prismaMock.tool.count.mockResolvedValue(0);

    const req = new NextRequest("http://localhost/api/marketplace?section=most-used");
    await GET(req);

    expect(prismaMock.tool.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ stats: { totalUsage: "desc" } }, { createdAt: "desc" }],
      })
    );
  });

  it("filters by category", async () => {
    prismaMock.tool.findMany.mockResolvedValue([]);
    prismaMock.tool.count.mockResolvedValue(0);

    const req = new NextRequest("http://localhost/api/marketplace?category=productivity");
    await GET(req);

    expect(prismaMock.tool.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: "productivity",
        }),
      })
    );
  });

  it("filters by search term", async () => {
    prismaMock.tool.findMany.mockResolvedValue([]);
    prismaMock.tool.count.mockResolvedValue(0);

    const req = new NextRequest("http://localhost/api/marketplace?search=chart");
    await GET(req);

    expect(prismaMock.tool.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ name: { contains: "chart", mode: "insensitive" } }),
          ]),
        }),
      })
    );
  });

  it("handles pagination with limit and offset", async () => {
    const tools = Array.from({ length: 5 }, (_, i) => ({
      id: `t${i}`,
      name: `Tool ${i}`,
      description: "desc",
      category: null,
      tags: [],
      visibility: "PUBLIC",
      createdAt: new Date(),
      author: { id: "u1", name: "Alice", image: null, department: "engineering" },
      stats: null,
    }));
    prismaMock.tool.findMany.mockResolvedValue(tools);
    prismaMock.tool.count.mockResolvedValue(20);
    prismaMock.toolStats.findMany.mockResolvedValue([]);

    const req = new NextRequest("http://localhost/api/marketplace?limit=5&offset=0");
    const res = await GET(req);
    const body = await res.json();
    expect(body.tools).toHaveLength(5);
    expect(body.total).toBe(20);
    expect(body.hasMore).toBe(true);
  });

  it("returns default stats when tool has no stats", async () => {
    prismaMock.tool.findMany.mockResolvedValue([
      {
        id: "t1",
        name: "Tool",
        description: null,
        category: null,
        tags: [],
        visibility: "PUBLIC",
        createdAt: new Date(),
        author: { id: "u1", name: "Alice", image: null, department: "engineering" },
        stats: null,
      },
    ]);
    prismaMock.tool.count.mockResolvedValue(1);
    prismaMock.toolStats.findMany.mockResolvedValue([]);

    const req = new NextRequest("http://localhost/api/marketplace");
    const res = await GET(req);
    const body = await res.json();
    expect(body.tools[0].stats).toEqual({
      totalUsage: 0,
      weeklyUsage: 0,
      averageRating: 0,
      totalReviews: 0,
    });
  });
});
