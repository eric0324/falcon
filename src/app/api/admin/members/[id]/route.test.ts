import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/admin", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { PATCH } from "./route";

const mockRequireAdmin = requireAdmin as ReturnType<typeof vi.fn>;
const mockFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>;
const mockUpdate = prisma.user.update as ReturnType<typeof vi.fn>;

function makeRequest(id: string, body: unknown) {
  return new Request(`http://localhost/api/admin/members/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/admin/members/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when not admin", async () => {
    mockRequireAdmin.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await PATCH(makeRequest("user-1", { department: "Engineering" }), {
      params: Promise.resolve({ id: "user-1" }),
    });

    expect(response.status).toBe(403);
  });

  it("returns 404 when user not found", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1" } });
    mockFindUnique.mockResolvedValue(null);

    const response = await PATCH(makeRequest("missing", { department: "Engineering" }), {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(response.status).toBe(404);
  });

  it("updates department successfully", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1" } });
    mockFindUnique.mockResolvedValue({ id: "user-1", department: null });
    mockUpdate.mockResolvedValue({ id: "user-1", department: "Engineering" });

    const response = await PATCH(makeRequest("user-1", { department: "Engineering" }), {
      params: Promise.resolve({ id: "user-1" }),
    });

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.department).toBe("Engineering");
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { department: "Engineering" },
      select: { id: true, department: true },
    });
  });

  it("clears department when empty string is provided", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1" } });
    mockFindUnique.mockResolvedValue({ id: "user-1", department: "Engineering" });
    mockUpdate.mockResolvedValue({ id: "user-1", department: null });

    const response = await PATCH(makeRequest("user-1", { department: "" }), {
      params: Promise.resolve({ id: "user-1" }),
    });

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.department).toBeNull();
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { department: null },
      select: { id: true, department: true },
    });
  });

  it("returns 400 when department is not a string", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1" } });

    const response = await PATCH(makeRequest("user-1", { department: 123 }), {
      params: Promise.resolve({ id: "user-1" }),
    });

    expect(response.status).toBe(400);
  });
});
