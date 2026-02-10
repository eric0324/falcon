import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/admin", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    conversation: {
      findMany: vi.fn(),
    },
    tokenUsage: {
      groupBy: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { GET } from "./route";

const mockRequireAdmin = requireAdmin as ReturnType<typeof vi.fn>;
const mockFindMany = prisma.conversation.findMany as ReturnType<typeof vi.fn>;
const mockGroupBy = prisma.tokenUsage.groupBy as ReturnType<typeof vi.fn>;
const mockFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>;

function makeRequest(id: string) {
  return new Request(`http://localhost/api/admin/members/${id}/conversations`);
}

describe("GET /api/admin/members/[id]/conversations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when not admin", async () => {
    mockRequireAdmin.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await GET(makeRequest("user-1"), { params: Promise.resolve({ id: "user-1" }) });

    expect(response.status).toBe(403);
  });

  it("returns 404 when user not found", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1" } });
    mockFindUnique.mockResolvedValue(null);

    const response = await GET(makeRequest("missing"), { params: Promise.resolve({ id: "missing" }) });

    expect(response.status).toBe(404);
  });

  it("returns conversations with token usage", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1" } });
    mockFindUnique.mockResolvedValue({
      id: "user-1",
      name: "Alice",
      email: "alice@company.com",
    });

    mockFindMany.mockResolvedValue([
      {
        id: "conv-1",
        title: "Test Conversation",
        messages: [{ role: "user", content: "Hi" }, { role: "assistant", content: "Hello" }],
        model: "claude-sonnet",
        updatedAt: new Date("2026-02-09"),
        createdAt: new Date("2026-02-09"),
      },
    ]);

    mockGroupBy.mockResolvedValue([
      {
        conversationId: "conv-1",
        model: "claude-sonnet",
        _sum: { inputTokens: 3000, outputTokens: 2000, totalTokens: 5000 },
      },
    ]);

    const response = await GET(makeRequest("user-1"), { params: Promise.resolve({ id: "user-1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.name).toBe("Alice");
    expect(data.conversations).toHaveLength(1);
    expect(data.conversations[0].title).toBe("Test Conversation");
    expect(data.conversations[0].messageCount).toBe(2);
    expect(data.conversations[0].totalTokens).toBe(5000);
    expect(data.conversations[0].estimatedCost).toBeGreaterThan(0);
  });

  it("excludes soft-deleted conversations", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1" } });
    mockFindUnique.mockResolvedValue({
      id: "user-1",
      name: "Alice",
      email: "alice@company.com",
    });
    mockFindMany.mockResolvedValue([]);
    mockGroupBy.mockResolvedValue([]);

    await GET(makeRequest("user-1"), { params: Promise.resolve({ id: "user-1" }) });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
        }),
      })
    );
  });
});
