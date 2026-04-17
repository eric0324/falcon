import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Mocks ----

const mockGenerateImage = vi.fn();
vi.mock("ai", () => ({
  generateImage: (...args: unknown[]) => mockGenerateImage(...args),
}));

const mockGoogleImage = vi.fn((id: string) => ({ __provider: "google", id }));
const mockCreateGoogle = vi.fn(() => ({ image: mockGoogleImage }));
vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: (...args: unknown[]) => mockCreateGoogle(...args),
}));

const mockOpenAIImage = vi.fn((id: string) => ({ __provider: "openai", id }));
const mockCreateOpenAI = vi.fn(() => ({ image: mockOpenAIImage }));
vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: (...args: unknown[]) => mockCreateOpenAI(...args),
}));

const mockGetConfigRequired = vi.fn();
vi.mock("@/lib/config", () => ({
  getConfigRequired: (key: string) => mockGetConfigRequired(key),
}));

const mockUploadImage = vi.fn();
const mockGetPresignedUrl = vi.fn();
const mockGetObjectBuffer = vi.fn();
vi.mock("@/lib/storage/s3", () => ({
  uploadImage: (...args: unknown[]) => mockUploadImage(...args),
  getPresignedUrl: (...args: unknown[]) => mockGetPresignedUrl(...args),
  getObjectBuffer: (...args: unknown[]) => mockGetObjectBuffer(...args),
}));

// Stable UUID for deterministic S3 keys
vi.stubGlobal("crypto", { randomUUID: () => "test-uuid" });

import { generateFromText, generateFromImage } from "./image-generation";

describe("image-generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfigRequired.mockImplementation(async (key: string) => {
      const map: Record<string, string> = {
        GOOGLE_GENERATIVE_AI_API_KEY: "google-key",
        OPENAI_API_KEY: "openai-key",
      };
      if (!(key in map)) throw new Error(`Missing: ${key}`);
      return map[key];
    });
    mockUploadImage.mockResolvedValue(undefined);
    mockGetPresignedUrl.mockResolvedValue("https://s3.example/signed");
  });

  describe("generateFromText", () => {
    it("uses Imagen 4 when provider is imagen", async () => {
      const bytes = new Uint8Array([1, 2, 3]);
      mockGenerateImage.mockResolvedValue({
        image: { uint8Array: bytes, mediaType: "image/png" },
      });

      const result = await generateFromText({
        prompt: "a cat",
        provider: "imagen",
        userId: "user-1",
      });

      expect(mockCreateGoogle).toHaveBeenCalledWith({ apiKey: "google-key" });
      expect(mockGoogleImage).toHaveBeenCalledWith("imagen-4.0-generate-001");
      expect(mockGenerateImage).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: "a cat",
          size: "1024x1024",
          n: 1,
        })
      );
      expect(mockUploadImage).toHaveBeenCalledWith({
        buffer: Buffer.from(bytes),
        key: "images/user-1/test-uuid.png",
        contentType: "image/png",
      });
      expect(result).toEqual({
        s3Key: "images/user-1/test-uuid.png",
        presignedUrl: "https://s3.example/signed",
        provider: "imagen",
        modelUsed: "imagen-4",
      });
    });

    it("uses GPT-Image-1 when provider is gpt-image", async () => {
      const bytes = new Uint8Array([9, 8, 7]);
      mockGenerateImage.mockResolvedValue({
        image: { uint8Array: bytes, mediaType: "image/png" },
      });

      const result = await generateFromText({
        prompt: "a dog",
        provider: "gpt-image",
        userId: "user-2",
      });

      expect(mockCreateOpenAI).toHaveBeenCalledWith({ apiKey: "openai-key" });
      expect(mockOpenAIImage).toHaveBeenCalledWith("gpt-image-1");
      expect(mockUploadImage).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "images/user-2/test-uuid.png",
        })
      );
      expect(result.provider).toBe("gpt-image");
      expect(result.modelUsed).toBe("gpt-image-1");
    });

    it("propagates provider errors", async () => {
      mockGenerateImage.mockRejectedValue(new Error("content filtered"));

      await expect(
        generateFromText({ prompt: "x", provider: "imagen", userId: "u" })
      ).rejects.toThrow(/content filtered/);
    });
  });

  describe("generateFromImage", () => {
    const sourceBytes = new Uint8Array([5, 5, 5]);

    beforeEach(() => {
      mockGetObjectBuffer.mockResolvedValue(Buffer.from(sourceBytes));
    });

    it("rejects when sourceImageKey does not belong to user", async () => {
      await expect(
        generateFromImage({
          prompt: "make it red",
          sourceImageKey: "images/other-user/file.png",
          provider: "imagen",
          userId: "user-1",
        })
      ).rejects.toThrow(/permission|not.*belong|ownership/i);
    });

    it("uses Gemini 2.5 Flash Image REST for imagen provider", async () => {
      const resultB64 = Buffer.from([7, 7, 7]).toString("base64");
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: { mimeType: "image/png", data: resultB64 },
                  },
                ],
              },
            },
          ],
        }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const result = await generateFromImage({
        prompt: "add a hat",
        sourceImageKey: "images/user-1/src.png",
        provider: "imagen",
        userId: "user-1",
      });

      expect(mockGetObjectBuffer).toHaveBeenCalledWith({
        key: "images/user-1/src.png",
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toContain("gemini-2.5-flash-image:generateContent");
      expect(url).toContain("key=google-key");
      expect(options.method).toBe("POST");
      const body = JSON.parse(options.body);
      expect(body.contents[0].parts).toEqual(
        expect.arrayContaining([
          { text: "add a hat" },
          {
            inlineData: {
              mimeType: "image/png",
              data: Buffer.from(sourceBytes).toString("base64"),
            },
          },
        ])
      );
      expect(mockUploadImage).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "images/user-1/test-uuid.png",
          buffer: Buffer.from(resultB64, "base64"),
        })
      );
      expect(result.provider).toBe("imagen");
      expect(result.modelUsed).toBe("gemini-2.5-flash-image");
    });

    it("uses OpenAI /v1/images/edits for gpt-image provider", async () => {
      const resultB64 = Buffer.from([3, 3, 3]).toString("base64");
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ b64_json: resultB64 }] }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const result = await generateFromImage({
        prompt: "remove background",
        sourceImageKey: "images/user-5/src.png",
        provider: "gpt-image",
        userId: "user-5",
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://api.openai.com/v1/images/edits");
      expect(options.method).toBe("POST");
      expect(options.headers.Authorization).toBe("Bearer openai-key");
      expect(options.body).toBeInstanceOf(FormData);
      expect(mockUploadImage).toHaveBeenCalledWith(
        expect.objectContaining({
          buffer: Buffer.from(resultB64, "base64"),
        })
      );
      expect(result.provider).toBe("gpt-image");
      expect(result.modelUsed).toBe("gpt-image-1");
    });

    it("throws when REST response is not ok", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
          text: async () => "bad request",
        })
      );

      await expect(
        generateFromImage({
          prompt: "x",
          sourceImageKey: "images/user-1/src.png",
          provider: "gpt-image",
          userId: "user-1",
        })
      ).rejects.toThrow(/400|bad request/i);
    });
  });
});
