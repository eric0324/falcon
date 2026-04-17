import { describe, it, expect, vi, beforeEach } from "vitest";
import { uploadImageToS3 } from "./upload-image-client";

describe("uploadImageToS3", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POSTs multipart to /api/chat/upload-image and returns s3Key", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ s3Key: "images/u/abc.png" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const file = new File([new Uint8Array(10)], "a.png", { type: "image/png" });
    const key = await uploadImageToS3(file);

    expect(key).toBe("images/u/abc.png");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/chat/upload-image");
    expect(opts.method).toBe("POST");
    expect(opts.body).toBeInstanceOf(FormData);
    const form = opts.body as FormData;
    expect(form.get("image")).toBe(file);
  });

  it("throws with status when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 413,
        text: async () => "File too large",
      })
    );

    const file = new File([new Uint8Array(10)], "a.png", { type: "image/png" });
    await expect(uploadImageToS3(file)).rejects.toThrow(/413/);
  });
});
