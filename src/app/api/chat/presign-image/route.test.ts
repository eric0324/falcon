import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSession = vi.hoisted(() => vi.fn());
const mockGetPresignedUrl = vi.hoisted(() => vi.fn());

vi.mock("@/lib/session", () => ({ getSession: mockGetSession }));
vi.mock("@/lib/storage/s3", () => ({ getPresignedUrl: mockGetPresignedUrl }));

import { GET } from "./route";

function buildReq(key?: string): Request {
  const url = key
    ? `http://localhost/api/chat/presign-image?key=${encodeURIComponent(key)}`
    : "http://localhost/api/chat/presign-image";
  return new Request(url);
}

describe("GET /api/chat/presign-image", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPresignedUrl.mockResolvedValue("https://s3.example/signed");
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(buildReq("images/u1/a.png"));
    expect(res.status).toBe(401);
    expect(mockGetPresignedUrl).not.toHaveBeenCalled();
  });

  it("returns 400 when key is missing", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    const res = await GET(buildReq());
    expect(res.status).toBe(400);
  });

  it("returns 403 when key does not belong to user", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    const res = await GET(buildReq("images/other-user/a.png"));
    expect(res.status).toBe(403);
    expect(mockGetPresignedUrl).not.toHaveBeenCalled();
  });

  it("returns 403 when key does not start with images/", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    const res = await GET(buildReq("secret/u1/a.png"));
    expect(res.status).toBe(403);
  });

  it("returns signed URL when key belongs to user", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    const res = await GET(buildReq("images/u1/a.png"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe("https://s3.example/signed");
    expect(mockGetPresignedUrl).toHaveBeenCalledWith({
      key: "images/u1/a.png",
    });
  });
});
