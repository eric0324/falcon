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

vi.mock("@/lib/knowledge/permissions", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/knowledge/permissions")
  >();
  return {
    ...actual,
    getKnowledgeBaseRole: vi.fn(),
  };
});

vi.mock("./knowledge-settings-client", () => ({
  KnowledgeSettingsClient: () => null,
}));

import KnowledgeSettingsPage from "./page";
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

describe("KnowledgeSettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /login when no session", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(KnowledgeSettingsPage(makeParams("kb-1"))).rejects.toThrow(
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

    await expect(KnowledgeSettingsPage(makeParams("kb-1"))).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );

    expect(mockNotFound).toHaveBeenCalled();
  });

  it("redirects to detail page when role is VIEWER", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "user-1", email: "a@b.com" },
    });
    mockGetRole.mockResolvedValue("VIEWER");

    await expect(KnowledgeSettingsPage(makeParams("kb-1"))).rejects.toThrow(
      "NEXT_REDIRECT:/knowledge/kb-1"
    );

    expect(mockRedirect).toHaveBeenCalledWith("/knowledge/kb-1");
    expect(mockNotFound).not.toHaveBeenCalled();
  });

  it("redirects to detail page when role is CONTRIBUTOR", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "user-1", email: "a@b.com" },
    });
    mockGetRole.mockResolvedValue("CONTRIBUTOR");

    await expect(KnowledgeSettingsPage(makeParams("kb-1"))).rejects.toThrow(
      "NEXT_REDIRECT:/knowledge/kb-1"
    );

    expect(mockRedirect).toHaveBeenCalledWith("/knowledge/kb-1");
  });

  it("renders client when role is ADMIN", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "user-1", email: "a@b.com" },
    });
    mockGetRole.mockResolvedValue("ADMIN");

    const result = await KnowledgeSettingsPage(makeParams("kb-1"));

    expect(result).toBeDefined();
    expect(mockNotFound).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
