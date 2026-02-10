import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./admin";

const mockGetSession = getServerSession as ReturnType<typeof vi.fn>;
const mockFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>;

describe("requireAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no session", async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await requireAdmin();

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it("returns 403 when user role is MEMBER", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "user-1", email: "test@company.com" },
    });
    mockFindUnique.mockResolvedValue({ id: "user-1", role: "MEMBER" });

    const result = await requireAdmin();

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it("returns session when user role is ADMIN", async () => {
    const session = {
      user: { id: "admin-1", email: "admin@company.com" },
    };
    mockGetSession.mockResolvedValue(session);
    mockFindUnique.mockResolvedValue({ id: "admin-1", role: "ADMIN" });

    const result = await requireAdmin();

    expect(result).toBe(session);
  });

  it("queries user role from database", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "user-1", email: "test@company.com" },
    });
    mockFindUnique.mockResolvedValue({ id: "user-1", role: "ADMIN" });

    await requireAdmin();

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { role: true },
    });
  });
});
