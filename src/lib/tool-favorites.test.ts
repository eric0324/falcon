import { describe, it, expect, vi, beforeEach } from "vitest";

const prismaMock = vi.hoisted(() => ({
  toolFavorite: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { getFavoriteToolIds, getFavoritedTools } from "./tool-favorites";

describe("getFavoriteToolIds", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns Set of toolIds for the user", async () => {
    prismaMock.toolFavorite.findMany.mockResolvedValue([
      { toolId: "t1" },
      { toolId: "t2" },
    ]);

    const ids = await getFavoriteToolIds("user-1");

    expect(ids).toBeInstanceOf(Set);
    expect(ids.has("t1")).toBe(true);
    expect(ids.has("t2")).toBe(true);
    expect(ids.size).toBe(2);
  });

  it("returns empty Set when user has no favorites", async () => {
    prismaMock.toolFavorite.findMany.mockResolvedValue([]);

    const ids = await getFavoriteToolIds("user-1");

    expect(ids).toBeInstanceOf(Set);
    expect(ids.size).toBe(0);
  });

  it("queries only the userId scope", async () => {
    prismaMock.toolFavorite.findMany.mockResolvedValue([]);

    await getFavoriteToolIds("user-1");

    expect(prismaMock.toolFavorite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
      })
    );
  });
});

describe("getFavoritedTools", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns favorited tools ordered by createdAt desc", async () => {
    prismaMock.toolFavorite.findMany.mockResolvedValue([
      {
        createdAt: new Date("2026-04-30"),
        tool: { id: "t2", name: "Tool 2", stats: null, author: { id: "a2" } },
      },
      {
        createdAt: new Date("2026-04-29"),
        tool: { id: "t1", name: "Tool 1", stats: null, author: { id: "a1" } },
      },
    ]);

    const tools = await getFavoritedTools("user-1");

    expect(tools).toHaveLength(2);
    expect(tools[0].id).toBe("t2");
    expect(tools[1].id).toBe("t1");
    expect(prismaMock.toolFavorite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
      })
    );
  });

  it("applies visibility filter via tool relation", async () => {
    prismaMock.toolFavorite.findMany.mockResolvedValue([]);

    await getFavoritedTools("user-1");

    const callArg = prismaMock.toolFavorite.findMany.mock.calls[0][0];
    expect(callArg.where.userId).toBe("user-1");
    expect(callArg.where.tool).toBeDefined();
    expect(callArg.where.tool.OR).toBeDefined();
  });

  it("respects take option", async () => {
    prismaMock.toolFavorite.findMany.mockResolvedValue([]);

    await getFavoritedTools("user-1", { take: 5 });

    expect(prismaMock.toolFavorite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 })
    );
  });

  it("defaults take to 12 when not provided", async () => {
    prismaMock.toolFavorite.findMany.mockResolvedValue([]);

    await getFavoritedTools("user-1");

    expect(prismaMock.toolFavorite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 12 })
    );
  });
});
