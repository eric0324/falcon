import { describe, it, expect, vi, beforeEach } from "vitest";

// Setup mocks with vi.hoisted
const mockGetServerSession = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  tool: { findMany: vi.fn(), create: vi.fn() },
  toolStats: { create: vi.fn() },
  conversation: { create: vi.fn() },
}));

vi.mock("next-auth", () => ({ getServerSession: mockGetServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET, POST } from "./route";

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

describe("GET /api/tools", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not logged in", async () => {
    setLoggedOut();
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns tool list when logged in", async () => {
    setLoggedIn();
    const tools = [
      { id: "t1", name: "Tool 1", description: "desc", visibility: "PRIVATE", createdAt: new Date(), updatedAt: new Date() },
    ];
    prismaMock.tool.findMany.mockResolvedValue(tools);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Tool 1");
  });
});

describe("POST /api/tools", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not logged in", async () => {
    setLoggedOut();
    const req = new Request("http://localhost/api/tools", {
      method: "POST",
      body: JSON.stringify({ name: "Test", code: "<div />" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    setLoggedIn();
    const req = new Request("http://localhost/api/tools", {
      method: "POST",
      body: JSON.stringify({ code: "<div />" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("required");
  });

  it("returns 400 when code is missing", async () => {
    setLoggedIn();
    const req = new Request("http://localhost/api/tools", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("creates tool successfully", async () => {
    setLoggedIn();
    const createdTool = {
      id: "t1",
      name: "Test Tool",
      code: "<div>Hello</div>",
      authorId: "user-1",
    };
    prismaMock.tool.create.mockResolvedValue(createdTool);
    prismaMock.toolStats.create.mockResolvedValue({});

    const req = new Request("http://localhost/api/tools", {
      method: "POST",
      body: JSON.stringify({ name: "Test Tool", code: "<div>Hello</div>" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Test Tool");
  });

  it("creates conversation when messages provided", async () => {
    setLoggedIn();
    prismaMock.conversation.create.mockResolvedValue({ id: "conv-1" });
    prismaMock.tool.create.mockResolvedValue({ id: "t1", name: "Test" });
    prismaMock.toolStats.create.mockResolvedValue({});

    const req = new Request("http://localhost/api/tools", {
      method: "POST",
      body: JSON.stringify({
        name: "Test",
        code: "<div />",
        messages: [{ role: "user", content: "hello" }],
      }),
    });
    await POST(req);
    expect(prismaMock.conversation.create).toHaveBeenCalled();
  });
});
