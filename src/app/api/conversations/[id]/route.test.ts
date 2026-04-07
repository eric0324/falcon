import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSession = vi.hoisted(() => vi.fn());
const mockGetMessages = vi.hoisted(() => vi.fn());
const mockReplaceMessages = vi.hoisted(() => vi.fn());
const mockLinkOrphanTokenUsage = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  conversation: {
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/session", () => ({ getSession: mockGetSession }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/conversation-messages", () => ({
  getMessages: mockGetMessages,
  replaceMessages: mockReplaceMessages,
  linkOrphanTokenUsage: mockLinkOrphanTokenUsage,
}));

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
    mockGetSession.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), { params });
    expect(res.status).toBe(401);
  });

  it("returns conversation with messages from ConversationMessage table", async () => {
    mockGetSession.mockResolvedValue(mockSession);
    prismaMock.conversation.findUnique.mockResolvedValue({
      id: "conv-1",
      title: "查詢訂單",
      model: "claude-sonnet-4-20250514",
      userId: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockGetMessages.mockResolvedValue([
      { role: "user", content: "hi" },
    ]);

    const res = await GET(new Request("http://localhost"), { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("conv-1");
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].content).toBe("hi");
    expect(mockGetMessages).toHaveBeenCalledWith("conv-1");
  });

  it("returns 404 when conversation not found", async () => {
    mockGetSession.mockResolvedValue(mockSession);
    prismaMock.conversation.findUnique.mockResolvedValue(null);

    const res = await GET(new Request("http://localhost"), { params });
    expect(res.status).toBe(404);
  });

  it("returns 403 when conversation belongs to another user", async () => {
    mockGetSession.mockResolvedValue(mockSession);
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
    mockGetSession.mockResolvedValue(null);
    const res = await PATCH(makeRequest({}), { params });
    expect(res.status).toBe(401);
  });

  it("updates conversation messages via replaceMessages", async () => {
    mockGetSession.mockResolvedValue(mockSession);
    prismaMock.conversation.findUnique.mockResolvedValue({
      id: "conv-1",
      userId: "user-1",
    });
    const newMessages = [
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
    ];
    mockReplaceMessages.mockResolvedValue(["msg-new-2"]);
    prismaMock.conversation.update.mockResolvedValue({
      id: "conv-1",
    });

    const res = await PATCH(makeRequest({ messages: newMessages }), { params });
    expect(res.status).toBe(200);
    expect(mockReplaceMessages).toHaveBeenCalledWith("conv-1", newMessages);

    // Orphan linking should delegate to linkOrphanTokenUsage with last assistant message
    expect(mockLinkOrphanTokenUsage).toHaveBeenCalledWith("user-1", "msg-new-2");
  });

  it("does not link orphan TokenUsage when messages not updated", async () => {
    mockGetSession.mockResolvedValue(mockSession);
    prismaMock.conversation.findUnique.mockResolvedValue({
      id: "conv-1",
      userId: "user-1",
    });
    prismaMock.conversation.update.mockResolvedValue({ id: "conv-1" });

    await PATCH(
      makeRequest({ model: "claude-3-5-haiku-20241022" }),
      { params }
    );
    expect(mockLinkOrphanTokenUsage).not.toHaveBeenCalled();
  });

  it("updates model without touching messages", async () => {
    mockGetSession.mockResolvedValue(mockSession);
    prismaMock.conversation.findUnique.mockResolvedValue({
      id: "conv-1",
      userId: "user-1",
    });
    prismaMock.conversation.update.mockResolvedValue({ id: "conv-1" });

    await PATCH(
      makeRequest({ model: "claude-3-5-haiku-20241022" }),
      { params }
    );
    expect(mockReplaceMessages).not.toHaveBeenCalled();
    expect(prismaMock.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          model: "claude-3-5-haiku-20241022",
        }),
      })
    );
  });

  it("returns 403 when conversation belongs to another user", async () => {
    mockGetSession.mockResolvedValue(mockSession);
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
    mockGetSession.mockResolvedValue(null);
    const res = await DELETE(new Request("http://localhost"), { params });
    expect(res.status).toBe(401);
  });

  it("soft-deletes conversation", async () => {
    mockGetSession.mockResolvedValue(mockSession);
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
    mockGetSession.mockResolvedValue(mockSession);
    prismaMock.conversation.findUnique.mockResolvedValue({
      id: "conv-1",
      userId: "other-user",
    });

    const res = await DELETE(new Request("http://localhost"), { params });
    expect(res.status).toBe(403);
  });
});
