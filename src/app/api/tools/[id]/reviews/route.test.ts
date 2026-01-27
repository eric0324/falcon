import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetServerSession = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  review: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
    aggregate: vi.fn(),
  },
  tool: { findUnique: vi.fn() },
  toolStats: { upsert: vi.fn(), update: vi.fn() },
}));

vi.mock("next-auth", () => ({ getServerSession: mockGetServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET, POST, DELETE } from "./route";

const mockSession = {
  user: { id: "user-1", email: "test@company.com", department: "engineering" },
};

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/tools/[id]/reviews", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns reviews list", async () => {
    const reviews = [
      { id: "r1", rating: 5, content: "Great", user: { id: "u1", name: "Alice", image: null }, replies: [] },
    ];
    prismaMock.review.findMany.mockResolvedValue(reviews);

    const req = new NextRequest("http://localhost/api/tools/t1/reviews");
    const res = await GET(req, makeParams("t1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].rating).toBe(5);
  });

  it("supports sort by rating", async () => {
    prismaMock.review.findMany.mockResolvedValue([]);
    const req = new NextRequest("http://localhost/api/tools/t1/reviews?sort=rating");
    await GET(req, makeParams("t1"));

    expect(prismaMock.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { rating: "desc" },
      })
    );
  });
});

describe("POST /api/tools/[id]/reviews", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not logged in", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/tools/t1/reviews", {
      method: "POST",
      body: JSON.stringify({ rating: 5, content: "Great" }),
    });
    const res = await POST(req, makeParams("t1"));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid rating (0)", async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const req = new NextRequest("http://localhost/api/tools/t1/reviews", {
      method: "POST",
      body: JSON.stringify({ rating: 0, content: "Bad" }),
    });
    const res = await POST(req, makeParams("t1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("between 1 and 5");
  });

  it("returns 400 for invalid rating (6)", async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const req = new NextRequest("http://localhost/api/tools/t1/reviews", {
      method: "POST",
      body: JSON.stringify({ rating: 6, content: "Too much" }),
    });
    const res = await POST(req, makeParams("t1"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when tool not found", async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    prismaMock.tool.findUnique.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/tools/t1/reviews", {
      method: "POST",
      body: JSON.stringify({ rating: 4, content: "Good" }),
    });
    const res = await POST(req, makeParams("t1"));
    expect(res.status).toBe(404);
  });

  it("creates/updates review successfully", async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    prismaMock.tool.findUnique.mockResolvedValue({
      id: "t1",
      authorId: "other-user",
    });
    prismaMock.review.upsert.mockResolvedValue({
      id: "r1",
      rating: 5,
      content: "Great",
      user: { id: "user-1", name: "Test User", image: null },
    });
    prismaMock.review.aggregate.mockResolvedValue({
      _avg: { rating: 4.5 },
      _count: 10,
    });
    prismaMock.toolStats.upsert.mockResolvedValue({});

    const req = new NextRequest("http://localhost/api/tools/t1/reviews", {
      method: "POST",
      body: JSON.stringify({ rating: 5, content: "Great" }),
    });
    const res = await POST(req, makeParams("t1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rating).toBe(5);
  });

  it("calculates weighted rating using IMDB formula", async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    prismaMock.tool.findUnique.mockResolvedValue({ id: "t1", authorId: "other" });
    prismaMock.review.upsert.mockResolvedValue({ id: "r1", rating: 5 });
    prismaMock.review.aggregate.mockResolvedValue({
      _avg: { rating: 4.0 },
      _count: 20,
    });
    prismaMock.toolStats.upsert.mockResolvedValue({});

    const req = new NextRequest("http://localhost/api/tools/t1/reviews", {
      method: "POST",
      body: JSON.stringify({ rating: 5, content: "test" }),
    });
    await POST(req, makeParams("t1"));

    // IMDB: (v/(v+m)) * R + (m/(v+m)) * C
    // v=20, m=10, R=4.0, C=3.0
    // = (20/30)*4.0 + (10/30)*3.0 = 2.667 + 1.0 = 3.667
    const expectedWeighted = (20 / 30) * 4.0 + (10 / 30) * 3.0;
    expect(prismaMock.toolStats.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          weightedRating: expectedWeighted,
        }),
      })
    );
  });
});

describe("DELETE /api/tools/[id]/reviews", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not logged in", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/tools/t1/reviews", { method: "DELETE" });
    const res = await DELETE(req, makeParams("t1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when no review to delete", async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    prismaMock.review.deleteMany.mockResolvedValue({ count: 0 });

    const req = new NextRequest("http://localhost/api/tools/t1/reviews", { method: "DELETE" });
    const res = await DELETE(req, makeParams("t1"));
    expect(res.status).toBe(404);
  });

  it("deletes own review successfully", async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    prismaMock.review.deleteMany.mockResolvedValue({ count: 1 });
    prismaMock.review.aggregate.mockResolvedValue({
      _avg: { rating: 4.0 },
      _count: 5,
    });
    prismaMock.toolStats.update.mockResolvedValue({});

    const req = new NextRequest("http://localhost/api/tools/t1/reviews", { method: "DELETE" });
    const res = await DELETE(req, makeParams("t1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
