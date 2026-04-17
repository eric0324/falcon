import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSession = vi.hoisted(() => vi.fn());
const mockUploadImage = vi.hoisted(() => vi.fn());

vi.mock("@/lib/session", () => ({ getSession: mockGetSession }));
vi.mock("@/lib/storage/s3", () => ({ uploadImage: mockUploadImage }));

vi.stubGlobal("crypto", { randomUUID: () => "test-uuid" });

import { POST } from "./route";

function buildReq(form: FormData): Request {
  return new Request("http://localhost/api/chat/upload-image", {
    method: "POST",
    body: form,
  });
}

function pngBlob(sizeBytes = 100): Blob {
  return new Blob([new Uint8Array(sizeBytes)], { type: "image/png" });
}

describe("POST /api/chat/upload-image", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUploadImage.mockResolvedValue(undefined);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const form = new FormData();
    form.append("image", pngBlob(), "a.png");

    const res = await POST(buildReq(form));

    expect(res.status).toBe(401);
    expect(mockUploadImage).not.toHaveBeenCalled();
  });

  it("returns 400 when no image field is provided", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(buildReq(new FormData()));
    expect(res.status).toBe(400);
  });

  it("returns 413 when file exceeds 10MB", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    const form = new FormData();
    form.append("image", pngBlob(10 * 1024 * 1024 + 1), "big.png");

    const res = await POST(buildReq(form));
    expect(res.status).toBe(413);
    expect(mockUploadImage).not.toHaveBeenCalled();
  });

  it("returns 415 for non-whitelisted mime type (gif)", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    const form = new FormData();
    form.append("image", new Blob([new Uint8Array(10)], { type: "image/gif" }), "a.gif");

    const res = await POST(buildReq(form));
    expect(res.status).toBe(415);
    expect(mockUploadImage).not.toHaveBeenCalled();
  });

  it("uploads a valid png and returns s3Key", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-42" } });
    const form = new FormData();
    form.append("image", pngBlob(200), "photo.png");

    const res = await POST(buildReq(form));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.s3Key).toBe("images/user-42/test-uuid.png");
    expect(mockUploadImage).toHaveBeenCalledWith({
      buffer: expect.any(Buffer),
      key: "images/user-42/test-uuid.png",
      contentType: "image/png",
    });
  });

  it("preserves extension based on mime for jpeg", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u" } });
    const form = new FormData();
    form.append(
      "image",
      new Blob([new Uint8Array(50)], { type: "image/jpeg" }),
      "x.jpg"
    );

    const res = await POST(buildReq(form));
    expect(res.status).toBe(200);
    expect(mockUploadImage).toHaveBeenCalledWith(
      expect.objectContaining({ key: "images/u/test-uuid.jpg" })
    );
  });

  it("accepts webp", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u" } });
    const form = new FormData();
    form.append(
      "image",
      new Blob([new Uint8Array(50)], { type: "image/webp" }),
      "x.webp"
    );

    const res = await POST(buildReq(form));
    expect(res.status).toBe(200);
    expect(mockUploadImage).toHaveBeenCalledWith(
      expect.objectContaining({ key: "images/u/test-uuid.webp" })
    );
  });
});
