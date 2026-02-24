import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockCreateConversationWithMessages = vi.hoisted(() => vi.fn());
const mockLinkOrphanTokenUsage = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  conversation: {
    findMany: vi.fn(),
  },
}));

vi.mock("next-auth", () => ({ getServerSession: mockGetServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/conversation-messages", () => ({
  createConversationWithMessages: mockCreateConversationWithMessages,
  linkOrphanTokenUsage: mockLinkOrphanTokenUsage,
}));

import { GET, POST } from "./route";

const mockSession = {
  user: { id: "user-1", email: "test@company.com", department: "engineering" },
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/conversations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not logged in", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/conversations"));
    expect(res.status).toBe(401);
  });

  it("returns user conversations ordered by updatedAt desc", async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    prismaMock.conversation.findMany.mockResolvedValue([
      {
        id: "conv-1",
        title: "查詢訂單",
        model: "claude-sonnet-4-20250514",
        updatedAt: new Date("2026-01-27"),
        tool: { id: "tool-1" },
      },
      {
        id: "conv-2",
        title: "問個問題",
        model: null,
        updatedAt: new Date("2026-01-26"),
        tool: null,
      },
    ]);

    const res = await GET(new Request("http://localhost/api/conversations"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].id).toBe("conv-1");
    expect(body[0].hasTool).toBe(true);
    expect(body[1].hasTool).toBe(false);
  });

  it("respects limit query param", async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    prismaMock.conversation.findMany.mockResolvedValue([]);

    await GET(new Request("http://localhost/api/conversations?limit=3"));
    expect(prismaMock.conversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 })
    );
  });
});

describe("POST /api/conversations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not logged in", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(401);
  });

  it("creates a conversation with messages via createConversationWithMessages", async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const messages = [
      { role: "user", content: "幫我查訂單" },
      { role: "assistant", content: "好的，讓我查看..." },
    ];
    mockCreateConversationWithMessages.mockResolvedValue({
      conversation: {
        id: "conv-new",
        title: "幫我查訂單",
        model: "claude-sonnet-4-20250514",
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      assistantMessageIds: ["msg-2"],
    });

    const res = await POST(
      makeRequest({
        messages,
        model: "claude-sonnet-4-20250514",
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("conv-new");
    expect(body.title).toBe("幫我查訂單");
    expect(mockCreateConversationWithMessages).toHaveBeenCalledWith({
      title: "幫我查訂單",
      model: "claude-sonnet-4-20250514",
      userId: "user-1",
      messages,
    });

    // Orphan linking should delegate to linkOrphanTokenUsage with last assistant message
    expect(mockLinkOrphanTokenUsage).toHaveBeenCalledWith("user-1", "msg-2");
  });

  it("auto-generates title from first user message (max 50 chars)", async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockCreateConversationWithMessages.mockResolvedValue({
      conversation: {
        id: "conv-new",
        title: "這是一個很長的訊息應該要被截斷到五十個字以內才對不然標題就太",
      },
      assistantMessageIds: [],
    });

    await POST(
      makeRequest({
        messages: [
          {
            role: "user",
            content:
              "這是一個很長的訊息應該要被截斷到五十個字以內才對不然標題就太長了會影響到顯示的效果",
          },
        ],
      })
    );

    const callArgs = mockCreateConversationWithMessages.mock.calls[0][0];
    expect(callArgs.title.length).toBeLessThanOrEqual(50);
  });

  it("returns 400 when messages are missing", async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });
});
