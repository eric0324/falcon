import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/admin", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
    tokenUsage: {
      groupBy: vi.fn(),
    },
  },
}));

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { GET } from "./route";

const mockRequireAdmin = requireAdmin as ReturnType<typeof vi.fn>;
const mockFindMany = prisma.user.findMany as ReturnType<typeof vi.fn>;
const mockGroupBy = prisma.tokenUsage.groupBy as ReturnType<typeof vi.fn>;

describe("GET /api/admin/members", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when not admin", async () => {
    mockRequireAdmin.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await GET();

    expect(response.status).toBe(403);
  });

  it("returns members sorted by total tokens descending", async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: "admin-1" },
    });

    mockFindMany.mockResolvedValue([
      {
        id: "user-1",
        name: "Alice",
        email: "alice@company.com",
        image: null,
        department: "Engineering",
        role: "MEMBER",
        createdAt: new Date("2026-01-01"),
        _count: { conversations: 5 },
      },
      {
        id: "user-2",
        name: "Bob",
        email: "bob@company.com",
        image: null,
        department: "Marketing",
        role: "MEMBER",
        createdAt: new Date("2026-01-15"),
        _count: { conversations: 2 },
      },
    ]);

    mockGroupBy.mockResolvedValue([
      {
        userId: "user-1",
        model: "claude-haiku",
        _sum: { inputTokens: 10000, outputTokens: 5000, totalTokens: 15000 },
        _max: { createdAt: new Date("2026-02-09") },
      },
      {
        userId: "user-2",
        model: "claude-sonnet",
        _sum: { inputTokens: 15000, outputTokens: 10000, totalTokens: 25000 },
        _max: { createdAt: new Date("2026-02-08") },
      },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
    // Bob has more tokens (25000) so should be first
    expect(data[0].name).toBe("Bob");
    expect(data[0].totalTokens).toBe(25000);
    expect(data[0].estimatedCost).toBeGreaterThan(0);
    expect(data[1].name).toBe("Alice");
    expect(data[1].totalTokens).toBe(15000);
    expect(data[1].conversationCount).toBe(5);
  });

  it("returns 0 tokens for users with no usage", async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: "admin-1" },
    });

    mockFindMany.mockResolvedValue([
      {
        id: "user-1",
        name: "New User",
        email: "new@company.com",
        image: null,
        department: null,
        role: "MEMBER",
        createdAt: new Date("2026-02-01"),
        _count: { conversations: 0 },
      },
    ]);

    mockGroupBy.mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(data[0].totalTokens).toBe(0);
    expect(data[0].estimatedCost).toBe(0);
    expect(data[0].lastActive).toBeNull();
  });
});
