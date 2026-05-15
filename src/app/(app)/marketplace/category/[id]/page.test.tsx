import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/tool-visibility", () => ({
  buildVisibilityFilter: vi.fn((userId: string) => ({
    OR: [{ visibility: "PUBLIC" }, { authorId: userId }],
  })),
}));

vi.mock("@/lib/tool-favorites", () => ({
  getFavoriteToolIds: vi.fn(async () => new Set<string>()),
}));

const findManyMock = vi.fn();
const countMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    tool: {
      get findMany() {
        return findManyMock;
      },
      get count() {
        return countMock;
      },
    },
  },
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
}));

vi.mock("@/components/marketplace-tool-card", () => ({
  MarketplaceToolCard: () => null,
}));

vi.mock("@/components/category-tools-grid", () => ({
  CategoryToolsGrid: () => null,
}));

import CategoryPage from "./page";
import { getSession } from "@/lib/session";
import { notFound } from "next/navigation";

const mockGetSession = getSession as ReturnType<typeof vi.fn>;
const mockNotFound = notFound as unknown as ReturnType<typeof vi.fn>;

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("CategoryPage — id='all' branch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findManyMock.mockResolvedValue([]);
    countMock.mockResolvedValue(0);
    mockGetSession.mockResolvedValue({ user: { id: "user-1", email: "a@b.com" } });
  });

  it("does not apply category filter when id is 'all'", async () => {
    await CategoryPage(makeParams("all"));

    expect(findManyMock).toHaveBeenCalled();
    const call = findManyMock.mock.calls[0][0];
    expect(call.where).toBeDefined();
    // The where clause must NOT have a `category` constraint
    expect(call.where.category).toBeUndefined();
    // Visibility filter is still applied via the mocked OR clause
    expect(call.where.OR).toBeDefined();
  });

  it("uses createdAt desc ordering and take=24 for the 'all' branch", async () => {
    await CategoryPage(makeParams("all"));

    const call = findManyMock.mock.calls[0][0];
    expect(call.orderBy).toEqual({ createdAt: "desc" });
    expect(call.take).toBe(24);
  });

  it("calls prisma.tool.count to compute hasMore for pagination", async () => {
    countMock.mockResolvedValue(50);
    await CategoryPage(makeParams("all"));

    expect(countMock).toHaveBeenCalled();
    const countCall = countMock.mock.calls[0][0];
    // Count uses the same where as findMany (no category)
    expect(countCall.where.category).toBeUndefined();
  });

  it("does NOT call notFound when id is 'all' (even though 'all' is not in TOOL_CATEGORIES)", async () => {
    await CategoryPage(makeParams("all"));

    expect(mockNotFound).not.toHaveBeenCalled();
  });

  it("still calls notFound for an unknown non-all id", async () => {
    await expect(CategoryPage(makeParams("does-not-exist"))).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
    expect(mockNotFound).toHaveBeenCalled();
  });

  it("redirects to /login when no session, regardless of id", async () => {
    mockGetSession.mockResolvedValue(null);
    await expect(CategoryPage(makeParams("all"))).rejects.toThrow(
      "NEXT_REDIRECT:/login"
    );
  });
});

describe("CategoryPage — regular category also paginates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findManyMock.mockResolvedValue([]);
    countMock.mockResolvedValue(0);
    mockGetSession.mockResolvedValue({ user: { id: "user-1", email: "a@b.com" } });
  });

  it("applies category filter for a valid category id", async () => {
    await CategoryPage(makeParams("productivity"));

    const call = findManyMock.mock.calls[0][0];
    expect(call.where.category).toBe("productivity");
  });

  it("uses take=24 and calls count for regular categories too", async () => {
    await CategoryPage(makeParams("productivity"));

    const findCall = findManyMock.mock.calls[0][0];
    expect(findCall.take).toBe(24);
    expect(findCall.orderBy).toEqual({ createdAt: "desc" });

    expect(countMock).toHaveBeenCalled();
    const countCall = countMock.mock.calls[0][0];
    expect(countCall.where.category).toBe("productivity");
  });
});
