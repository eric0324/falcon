import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetServerSession = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  conversation: {
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("next-auth", () => ({ getServerSession: mockGetServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET, PATCH, DELETE } from "./route";

const mockSession = {
  user: { id: "user-1", email: "test@company.com", department: "engineering" },
};

const params = Promise.resolve({ id: "conv-1" });

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/conversations/conv-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/conversations/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not logged in", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), { params });
    expect(res.status).toBe(401);
  });

  it("returns conversation with messages", async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    prismaMock.conversation.findUnique.mockResolvedValue({
      id: "conv-1",
      title: "查詢訂單",
      messages: [{ role: "user", content: "hi" }],
      model: "claude-sonnet-4-20250514",
      userId: "user-1",
      tool: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await GET(new Request("http://localhost"), { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("conv-1");
    expect(body.messages).toHaveLength(1);
  });

  it("returns 404 when conversation not found", async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    prismaMock.conversation.findUnique.mockResolvedValue(null);

    const res = await GET(new Request("http://localhost"), { params });
    expect(res.status).toBe(404);
  });

  it("returns 403 when conversation belongs to another user", async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    prismaMock.conversation.findUnique.mockResolvedValue({
      id: "conv-1",
      userId: "other-user",
    });

    const res = await GET(new Request("http://localhost"), { params });
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/conversations/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not logged in", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await PATCH(makeRequest({}), { params });
    expect(res.status).toBe(401);
  });

  it("updates conversation messages", async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    prismaMock.conversation.findUnique.mockResolvedValue({
      id: "conv-1",
      userId: "user-1",
    });
    const newMessages = [
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
    ];
    prismaMock.conversation.update.mockResolvedValue({
      id: "conv-1",
      messages: newMessages,
    });

    const res = await PATCH(makeRequest({ messages: newMessages }), { params });
    expect(res.status).toBe(200);
    expect(prismaMock.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "conv-1" },
        data: expect.objectContaining({ messages: newMessages }),
      })
    );
  });

  it("updates model", async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    prismaMock.conversation.findUnique.mockResolvedValue({
      id: "conv-1",
      userId: "user-1",
    });
    prismaMock.conversation.update.mockResolvedValue({ id: "conv-1" });

    await PATCH(
      makeRequest({ model: "claude-3-5-haiku-20241022" }),
      { params }
    );
    expect(prismaMock.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          model: "claude-3-5-haiku-20241022",
        }),
      })
    );
  });

  it("returns 403 when conversation belongs to another user", async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    prismaMock.conversation.findUnique.mockResolvedValue({
      id: "conv-1",
      userId: "other-user",
    });

    const res = await PATCH(makeRequest({ messages: [] }), { params });
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/conversations/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not logged in", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await DELETE(new Request("http://localhost"), { params });
    expect(res.status).toBe(401);
  });

  it("soft-deletes conversation", async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    prismaMock.conversation.findUnique.mockResolvedValue({
      id: "conv-1",
      userId: "user-1",
    });
    prismaMock.conversation.update.mockResolvedValue({});

    const res = await DELETE(new Request("http://localhost"), { params });
    expect(res.status).toBe(200);
    expect(prismaMock.conversation.update).toHaveBeenCalledWith({
      where: { id: "conv-1" },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it("returns 403 when conversation belongs to another user", async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    prismaMock.conversation.findUnique.mockResolvedValue({
      id: "conv-1",
      userId: "other-user",
    });

    const res = await DELETE(new Request("http://localhost"), { params });
    expect(res.status).toBe(403);
  });
});
