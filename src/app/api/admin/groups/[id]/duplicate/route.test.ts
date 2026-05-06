import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/admin", () => ({
  requireAdmin: vi.fn(),
}));

const groupMock = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    group: groupMock,
    $transaction: vi.fn(async (cb: any) => cb({ group: groupMock })),
  },
}));

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { POST } from "./route";

const mockRequireAdmin = requireAdmin as ReturnType<typeof vi.fn>;

function makeRequest(id: string) {
  return new Request(`http://localhost/api/admin/groups/${id}/duplicate`, {
    method: "POST",
  });
}

function callPost(id: string) {
  return POST(makeRequest(id), { params: Promise.resolve({ id }) });
}

describe("POST /api/admin/groups/[id]/duplicate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when not admin", async () => {
    mockRequireAdmin.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const res = await callPost("g-1");
    expect(res.status).toBe(403);
  });

  it("returns 404 when source group not found", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1" } });
    groupMock.findUnique.mockResolvedValue(null);

    const res = await callPost("missing");
    expect(res.status).toBe(404);
  });

  it("creates new group with same table and column connections", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1" } });
    groupMock.findUnique.mockResolvedValue({
      name: "業務組",
      tables: [{ id: "t-1" }, { id: "t-2" }],
      columns: [{ id: "c-1" }, { id: "c-2" }, { id: "c-3" }],
    });
    groupMock.findMany.mockResolvedValue([]);
    groupMock.create.mockResolvedValue({
      id: "g-new",
      name: "業務組 (副本)",
      createdAt: new Date("2026-05-06T10:00:00Z"),
    });

    const res = await callPost("g-1");
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.name).toBe("業務組 (副本)");
    expect(body.userCount).toBe(0);

    expect(groupMock.create).toHaveBeenCalledWith({
      data: {
        name: "業務組 (副本)",
        tables: { connect: [{ id: "t-1" }, { id: "t-2" }] },
        columns: { connect: [{ id: "c-1" }, { id: "c-2" }, { id: "c-3" }] },
      },
      select: { id: true, name: true, createdAt: true },
    });
  });

  it("appends (副本 2) when (副本) already exists", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1" } });
    groupMock.findUnique.mockResolvedValue({
      name: "業務組",
      tables: [],
      columns: [],
    });
    groupMock.findMany.mockResolvedValue([{ name: "業務組 (副本)" }]);
    groupMock.create.mockResolvedValue({
      id: "g-new",
      name: "業務組 (副本 2)",
      createdAt: new Date(),
    });

    await callPost("g-1");

    expect(groupMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "業務組 (副本 2)" }),
      })
    );
  });

  it("appends (副本 3) when (副本) and (副本 2) exist", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1" } });
    groupMock.findUnique.mockResolvedValue({
      name: "業務組",
      tables: [],
      columns: [],
    });
    groupMock.findMany.mockResolvedValue([
      { name: "業務組 (副本)" },
      { name: "業務組 (副本 2)" },
    ]);
    groupMock.create.mockResolvedValue({
      id: "g-new",
      name: "業務組 (副本 3)",
      createdAt: new Date(),
    });

    await callPost("g-1");

    expect(groupMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "業務組 (副本 3)" }),
      })
    );
  });

  it("does not copy users or tools (only tables and columns connect fields are passed)", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1" } });
    groupMock.findUnique.mockResolvedValue({
      name: "業務組",
      tables: [{ id: "t-1" }],
      columns: [{ id: "c-1" }],
    });
    groupMock.findMany.mockResolvedValue([]);
    groupMock.create.mockResolvedValue({
      id: "g-new",
      name: "業務組 (副本)",
      createdAt: new Date(),
    });

    await callPost("g-1");

    const createArgs = groupMock.create.mock.calls[0][0];
    expect(createArgs.data).not.toHaveProperty("users");
    expect(createArgs.data).not.toHaveProperty("tools");
  });
});
