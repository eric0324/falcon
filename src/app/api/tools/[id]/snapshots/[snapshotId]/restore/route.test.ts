import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSession = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  tool: { findUnique: vi.fn() },
}));
const mockRestoreSnapshot = vi.hoisted(() => vi.fn());

vi.mock("@/lib/session", () => ({ getSession: mockGetSession }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/tool-snapshot", () => ({ restoreSnapshot: mockRestoreSnapshot }));

import { POST } from "./route";

const req = new Request(
  "http://localhost/api/tools/t1/snapshots/s1/restore",
  { method: "POST" }
);
const params = Promise.resolve({ id: "t1", snapshotId: "s1" });

describe("POST /api/tools/[id]/snapshots/[snapshotId]/restore", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await POST(req, { params });
    expect(res.status).toBe(401);
    expect(mockRestoreSnapshot).not.toHaveBeenCalled();
  });

  it("returns 404 when the tool does not exist", async () => {
    mockGetSession.mockResolvedValue({ user: { email: "a@b.com" } });
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1" });
    prismaMock.tool.findUnique.mockResolvedValue(null);

    const res = await POST(req, { params });
    expect(res.status).toBe(404);
  });

  it("returns 403 when not owner", async () => {
    mockGetSession.mockResolvedValue({ user: { email: "a@b.com" } });
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1" });
    prismaMock.tool.findUnique.mockResolvedValue({ authorId: "other" });

    const res = await POST(req, { params });
    expect(res.status).toBe(403);
    expect(mockRestoreSnapshot).not.toHaveBeenCalled();
  });

  it("returns updated tool on success", async () => {
    mockGetSession.mockResolvedValue({ user: { email: "a@b.com" } });
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1" });
    prismaMock.tool.findUnique.mockResolvedValue({ authorId: "u1" });
    mockRestoreSnapshot.mockResolvedValue({ id: "t1", code: "restored" });

    const res = await POST(req, { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ id: "t1", code: "restored" });
    expect(mockRestoreSnapshot).toHaveBeenCalledWith("t1", "s1");
  });

  it("returns 404 when snapshot does not exist", async () => {
    mockGetSession.mockResolvedValue({ user: { email: "a@b.com" } });
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1" });
    prismaMock.tool.findUnique.mockResolvedValue({ authorId: "u1" });
    mockRestoreSnapshot.mockRejectedValue(
      new Error("Snapshot missing not found for tool t1")
    );

    const res = await POST(req, { params });
    expect(res.status).toBe(404);
  });
});
