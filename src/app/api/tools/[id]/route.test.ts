import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetServerSession = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  tool: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
  conversation: { create: vi.fn(), update: vi.fn() },
}));

vi.mock("next-auth", () => ({ getServerSession: mockGetServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET, PATCH, DELETE } from "./route";

const mockSession = {
  user: { id: "user-1", email: "test@company.com", department: "engineering" },
};

function setLoggedIn() {
  mockGetServerSession.mockResolvedValue(mockSession);
  prismaMock.user.findUnique.mockResolvedValue({ id: "user-1" });
}

function setLoggedOut() {
  mockGetServerSession.mockResolvedValue(null);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/tools/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not logged in", async () => {
    setLoggedOut();
    const res = await GET(new Request("http://localhost"), makeParams("t1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when tool not found", async () => {
    setLoggedIn();
    prismaMock.tool.findUnique.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), makeParams("t1"));
    expect(res.status).toBe(404);
  });

  it("returns 403 for PRIVATE tool by non-author", async () => {
    setLoggedIn();
    prismaMock.tool.findUnique.mockResolvedValue({
      id: "t1",
      name: "Tool",
      visibility: "PRIVATE",
      authorId: "other-user",
      author: { id: "other-user", name: "Other", email: "other@company.com" },
    });
    const res = await GET(new Request("http://localhost"), makeParams("t1"));
    expect(res.status).toBe(403);
  });

  it("returns tool for author of PRIVATE tool", async () => {
    setLoggedIn();
    const tool = {
      id: "t1",
      name: "My Tool",
      visibility: "PRIVATE",
      authorId: "user-1",
      author: { id: "user-1", name: "Test User", email: "test@company.com" },
    };
    prismaMock.tool.findUnique.mockResolvedValue(tool);
    const res = await GET(new Request("http://localhost"), makeParams("t1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("My Tool");
  });

  it("returns PUBLIC tool for any logged in user", async () => {
    setLoggedIn();
    prismaMock.tool.findUnique.mockResolvedValue({
      id: "t1",
      name: "Public Tool",
      visibility: "PUBLIC",
      authorId: "other-user",
      author: { id: "other-user", name: "Other", email: "other@company.com" },
    });
    const res = await GET(new Request("http://localhost"), makeParams("t1"));
    expect(res.status).toBe(200);
  });
});

describe("PATCH /api/tools/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not logged in", async () => {
    setLoggedOut();
    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated" }),
    });
    const res = await PATCH(req, makeParams("t1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when tool not found", async () => {
    setLoggedIn();
    prismaMock.tool.findUnique.mockResolvedValue(null);
    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated" }),
    });
    const res = await PATCH(req, makeParams("nonexistent"));
    expect(res.status).toBe(404);
  });

  it("returns 403 for non-author", async () => {
    setLoggedIn();
    prismaMock.tool.findUnique.mockResolvedValue({
      id: "t1",
      authorId: "other-user",
    });
    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated" }),
    });
    const res = await PATCH(req, makeParams("t1"));
    expect(res.status).toBe(403);
  });

  it("updates existing conversation when messages provided", async () => {
    setLoggedIn();
    prismaMock.tool.findUnique.mockResolvedValue({
      id: "t1",
      authorId: "user-1",
      conversationId: "conv-1",
    });
    prismaMock.conversation.update.mockResolvedValue({});
    prismaMock.tool.update.mockResolvedValue({ id: "t1", name: "Tool" });

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({
        name: "Tool",
        messages: [{ role: "user", content: "hello" }],
      }),
    });
    const res = await PATCH(req, makeParams("t1"));
    expect(res.status).toBe(200);
    expect(prismaMock.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "conv-1" },
      })
    );
  });

  it("creates new conversation when messages provided but no existing conversation", async () => {
    setLoggedIn();
    prismaMock.tool.findUnique.mockResolvedValue({
      id: "t1",
      authorId: "user-1",
      conversationId: null,
    });
    prismaMock.conversation.create.mockResolvedValue({ id: "conv-new" });
    prismaMock.tool.update.mockResolvedValue({ id: "t1", name: "Tool" });

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({
        name: "Tool",
        messages: [{ role: "user", content: "hello" }],
      }),
    });
    const res = await PATCH(req, makeParams("t1"));
    expect(res.status).toBe(200);
    expect(prismaMock.conversation.create).toHaveBeenCalled();
    // Should also update the tool with the new conversationId
    expect(prismaMock.tool.update).toHaveBeenCalledTimes(2);
  });

  it("updates tool successfully", async () => {
    setLoggedIn();
    prismaMock.tool.findUnique.mockResolvedValue({
      id: "t1",
      authorId: "user-1",
    });
    prismaMock.tool.update.mockResolvedValue({
      id: "t1",
      name: "Updated Tool",
      authorId: "user-1",
    });

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated Tool" }),
    });
    const res = await PATCH(req, makeParams("t1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Updated Tool");
  });
});

describe("DELETE /api/tools/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not logged in", async () => {
    setLoggedOut();
    const req = new Request("http://localhost", { method: "DELETE" });
    const res = await DELETE(req, makeParams("t1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when tool not found", async () => {
    setLoggedIn();
    prismaMock.tool.findUnique.mockResolvedValue(null);
    const req = new Request("http://localhost", { method: "DELETE" });
    const res = await DELETE(req, makeParams("t1"));
    expect(res.status).toBe(404);
  });

  it("returns 403 for non-author", async () => {
    setLoggedIn();
    prismaMock.tool.findUnique.mockResolvedValue({
      id: "t1",
      authorId: "other-user",
    });
    const req = new Request("http://localhost", { method: "DELETE" });
    const res = await DELETE(req, makeParams("t1"));
    expect(res.status).toBe(403);
  });

  it("deletes tool successfully", async () => {
    setLoggedIn();
    prismaMock.tool.findUnique.mockResolvedValue({
      id: "t1",
      authorId: "user-1",
    });
    prismaMock.tool.delete.mockResolvedValue({});

    const req = new Request("http://localhost", { method: "DELETE" });
    const res = await DELETE(req, makeParams("t1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
