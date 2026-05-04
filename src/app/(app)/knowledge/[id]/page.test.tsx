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

vi.mock("@/lib/knowledge/permissions", () => ({
  getKnowledgeBaseRole: vi.fn(),
}));

vi.mock("./knowledge-detail-client", () => ({
  KnowledgeDetailClient: () => null,
}));

import KnowledgeDetailPage from "./page";
import { getSession } from "@/lib/session";
import { getKnowledgeBaseRole } from "@/lib/knowledge/permissions";
import { notFound, redirect } from "next/navigation";

const mockGetSession = getSession as ReturnType<typeof vi.fn>;
const mockGetRole = getKnowledgeBaseRole as ReturnType<typeof vi.fn>;
const mockNotFound = notFound as unknown as ReturnType<typeof vi.fn>;
const mockRedirect = redirect as unknown as ReturnType<typeof vi.fn>;

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("KnowledgeDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /login when no session", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(KnowledgeDetailPage(makeParams("kb-1"))).rejects.toThrow(
      "NEXT_REDIRECT:/login"
    );

    expect(mockRedirect).toHaveBeenCalledWith("/login");
    expect(mockGetRole).not.toHaveBeenCalled();
  });

  it("calls notFound when authenticated user has no role on the KB", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "user-1", email: "a@b.com" },
    });
    mockGetRole.mockResolvedValue(null);

    await expect(KnowledgeDetailPage(makeParams("kb-1"))).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );

    expect(mockGetRole).toHaveBeenCalledWith("kb-1", "user-1");
    expect(mockNotFound).toHaveBeenCalled();
  });

  it("renders client when user has VIEWER role", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "user-1", email: "a@b.com" },
    });
    mockGetRole.mockResolvedValue("VIEWER");

    const result = await KnowledgeDetailPage(makeParams("kb-1"));

    expect(result).toBeDefined();
    expect(mockNotFound).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("renders client when user has ADMIN role", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "user-1", email: "a@b.com" },
    });
    mockGetRole.mockResolvedValue("ADMIN");

    const result = await KnowledgeDetailPage(makeParams("kb-1"));

    expect(result).toBeDefined();
    expect(mockNotFound).not.toHaveBeenCalled();
  });
});
