import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSession = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  tool: { findUnique: vi.fn() },
}));
const mockListSnapshots = vi.hoisted(() => vi.fn());

vi.mock("@/lib/session", () => ({ getSession: mockGetSession }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/tool-snapshot", () => ({ listSnapshots: mockListSnapshots }));

import { GET } from "./route";

const req = new Request("http://localhost/api/tools/t1/snapshots");
const params = Promise.resolve({ id: "t1" });

describe("GET /api/tools/[id]/snapshots", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(req, { params });
    expect(res.status).toBe(401);
  });

  it("returns 401 when session has email but no matching user", async () => {
    mockGetSession.mockResolvedValue({ user: { email: "a@b.com" } });
    prismaMock.user.findUnique.mockResolvedValue(null);
    const res = await GET(req, { params });
    expect(res.status).toBe(401);
  });

  it("returns 404 when the tool does not exist", async () => {
    mockGetSession.mockResolvedValue({ user: { email: "a@b.com" } });
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1" });
    prismaMock.tool.findUnique.mockResolvedValue(null);

    const res = await GET(req, { params });
    expect(res.status).toBe(404);
  });

  it("returns 403 when the caller is not the tool author", async () => {
    mockGetSession.mockResolvedValue({ user: { email: "a@b.com" } });
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1" });
    prismaMock.tool.findUnique.mockResolvedValue({ authorId: "other" });

    const res = await GET(req, { params });
    expect(res.status).toBe(403);
  });

  it("returns snapshots when author is authorised", async () => {
    mockGetSession.mockResolvedValue({ user: { email: "a@b.com" } });
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1" });
    prismaMock.tool.findUnique.mockResolvedValue({ authorId: "u1" });
    mockListSnapshots.mockResolvedValue([
      { id: "s1", explanation: "e1", createdAt: new Date("2026-04-17") },
    ]);

    const res = await GET(req, { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([
      { id: "s1", explanation: "e1", createdAt: "2026-04-17T00:00:00.000Z" },
    ]);
    expect(mockListSnapshots).toHaveBeenCalledWith("t1");
  });
});
