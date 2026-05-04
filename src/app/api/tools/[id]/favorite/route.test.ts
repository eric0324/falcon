import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSession = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  tool: {
    findFirst: vi.fn(),
  },
  toolFavorite: {
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

vi.mock("@/lib/session", () => ({ getSession: mockGetSession }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { POST, DELETE } from "./route";

const mockSession = { user: { id: "user-1" } };

function makeRequest(method: "POST" | "DELETE") {
  return new Request("http://localhost/api/tools/tool-1/favorite", { method });
}
function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/tools/[id]/favorite", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not logged in", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await POST(makeRequest("POST"), makeContext("tool-1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when tool does not exist or not visible", async () => {
    mockGetSession.mockResolvedValue(mockSession);
    prismaMock.tool.findFirst.mockResolvedValue(null);
    const res = await POST(makeRequest("POST"), makeContext("tool-x"));
    expect(res.status).toBe(404);
  });

  it("creates favorite for visible tool", async () => {
    mockGetSession.mockResolvedValue(mockSession);
    prismaMock.tool.findFirst.mockResolvedValue({ id: "tool-1" });
    prismaMock.toolFavorite.upsert.mockResolvedValue({ id: "fav-1" });

    const res = await POST(makeRequest("POST"), makeContext("tool-1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.favorited).toBe(true);
    expect(prismaMock.toolFavorite.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_toolId: { userId: "user-1", toolId: "tool-1" } },
      })
    );
  });

  it("is idempotent on repeated POST", async () => {
    mockGetSession.mockResolvedValue(mockSession);
    prismaMock.tool.findFirst.mockResolvedValue({ id: "tool-1" });
    prismaMock.toolFavorite.upsert.mockResolvedValue({ id: "fav-1" });

    const res1 = await POST(makeRequest("POST"), makeContext("tool-1"));
    const res2 = await POST(makeRequest("POST"), makeContext("tool-1"));

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect((await res2.json()).favorited).toBe(true);
  });
});

describe("DELETE /api/tools/[id]/favorite", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not logged in", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await DELETE(makeRequest("DELETE"), makeContext("tool-1"));
    expect(res.status).toBe(401);
  });

  it("removes favorite", async () => {
    mockGetSession.mockResolvedValue(mockSession);
    prismaMock.toolFavorite.deleteMany.mockResolvedValue({ count: 1 });
    const res = await DELETE(makeRequest("DELETE"), makeContext("tool-1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.favorited).toBe(false);
    expect(prismaMock.toolFavorite.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1", toolId: "tool-1" },
    });
  });

  it("is idempotent when no favorite exists", async () => {
    mockGetSession.mockResolvedValue(mockSession);
    prismaMock.toolFavorite.deleteMany.mockResolvedValue({ count: 0 });
    const res = await DELETE(makeRequest("DELETE"), makeContext("tool-1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.favorited).toBe(false);
  });
});
