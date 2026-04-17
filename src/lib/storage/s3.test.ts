import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSend = vi.fn();
const mockGetSignedUrl = vi.fn();
const putObjectCtor = vi.fn();
const getObjectCtor = vi.fn();

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: function MockS3Client(this: { __config: unknown; send: typeof mockSend }, config: unknown) {
    this.__config = config;
    this.send = mockSend;
  },
  PutObjectCommand: function MockPutObjectCommand(this: { __type: string; input: unknown }, input: unknown) {
    putObjectCtor(input);
    this.__type = "PutObjectCommand";
    this.input = input;
  },
  GetObjectCommand: function MockGetObjectCommand(this: { __type: string; input: unknown }, input: unknown) {
    getObjectCtor(input);
    this.__type = "GetObjectCommand";
    this.input = input;
  },
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
}));

const mockGetConfigRequired = vi.fn();
vi.mock("@/lib/config", () => ({
  getConfigRequired: (key: string) => mockGetConfigRequired(key),
}));

import { uploadImage, getPresignedUrl, getObjectBuffer } from "./s3";

describe("s3 storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfigRequired.mockImplementation(async (key: string) => {
      const map: Record<string, string> = {
        AWS_S3_BUCKET: "test-bucket",
        AWS_S3_REGION: "ap-northeast-1",
        AWS_ACCESS_KEY_ID: "AKIATEST",
        AWS_SECRET_ACCESS_KEY: "secret",
      };
      const value = map[key];
      if (!value) throw new Error(`Missing required config: ${key}`);
      return value;
    });
  });

  describe("uploadImage", () => {
    it("uploads to S3 with correct params", async () => {
      mockSend.mockResolvedValue({});
      const buffer = Buffer.from("fake-png-data");

      await uploadImage({
        buffer,
        key: "images/user123/abc.png",
        contentType: "image/png",
      });

      expect(putObjectCtor).toHaveBeenCalledWith({
        Bucket: "test-bucket",
        Key: "images/user123/abc.png",
        Body: buffer,
        ContentType: "image/png",
      });
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("throws when bucket config is missing", async () => {
      mockGetConfigRequired.mockImplementation(async (key: string) => {
        if (key === "AWS_S3_BUCKET") {
          throw new Error("Missing required config: AWS_S3_BUCKET");
        }
        return "anything";
      });

      await expect(
        uploadImage({
          buffer: Buffer.from("x"),
          key: "k",
          contentType: "image/png",
        })
      ).rejects.toThrow(/AWS_S3_BUCKET/);
    });
  });

  describe("getPresignedUrl", () => {
    it("returns signed URL with default TTL 3600", async () => {
      mockGetSignedUrl.mockResolvedValue("https://s3.example/signed-url");

      const url = await getPresignedUrl({ key: "images/user/abc.png" });

      expect(url).toBe("https://s3.example/signed-url");
      expect(getObjectCtor).toHaveBeenCalledWith({
        Bucket: "test-bucket",
        Key: "images/user/abc.png",
      });
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ __type: "GetObjectCommand" }),
        { expiresIn: 3600 }
      );
    });

    it("uses custom TTL when provided", async () => {
      mockGetSignedUrl.mockResolvedValue("https://signed");

      await getPresignedUrl({ key: "k", ttlSeconds: 900 });

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 900 }
      );
    });

    it("throws when credentials missing", async () => {
      mockGetConfigRequired.mockImplementation(async (key: string) => {
        if (key === "AWS_ACCESS_KEY_ID") {
          throw new Error("Missing required config: AWS_ACCESS_KEY_ID");
        }
        return "val";
      });

      await expect(getPresignedUrl({ key: "k" })).rejects.toThrow(
        /AWS_ACCESS_KEY_ID/
      );
    });
  });

  describe("getObjectBuffer", () => {
    it("reads object body as Buffer", async () => {
      const bytes = new Uint8Array([1, 2, 3, 4]);
      mockSend.mockResolvedValue({
        Body: {
          transformToByteArray: async () => bytes,
        },
      });

      const buf = await getObjectBuffer({ key: "images/u/a.png" });

      expect(getObjectCtor).toHaveBeenCalledWith({
        Bucket: "test-bucket",
        Key: "images/u/a.png",
      });
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.equals(Buffer.from(bytes))).toBe(true);
    });

    it("throws when object has no body", async () => {
      mockSend.mockResolvedValue({ Body: undefined });

      await expect(getObjectBuffer({ key: "k" })).rejects.toThrow(/empty|body/i);
    });
  });
});
