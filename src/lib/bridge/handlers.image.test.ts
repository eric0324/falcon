import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGenerateFromText = vi.fn();
const mockGenerateFromImage = vi.fn();
const mockCheckQuota = vi.fn();
const mockTokenUsageCreate = vi.fn();
const mockUploadImage = vi.fn();
const mockGetPresignedUrl = vi.fn();
const mockGetObjectBuffer = vi.fn();
const mockToolFindUnique = vi.fn();
const mockCanUserAccessTool = vi.fn();

vi.mock("@/lib/ai/image-generation", () => ({
  generateFromText: (...args: unknown[]) => mockGenerateFromText(...args),
  generateFromImage: (...args: unknown[]) => mockGenerateFromImage(...args),
}));

vi.mock("@/lib/storage/s3", () => ({
  uploadImage: (...args: unknown[]) => mockUploadImage(...args),
  getPresignedUrl: (...args: unknown[]) => mockGetPresignedUrl(...args),
  getObjectBuffer: (...args: unknown[]) => mockGetObjectBuffer(...args),
}));

vi.mock("@/lib/quota", () => ({
  checkQuota: (...args: unknown[]) => mockCheckQuota(...args),
}));

vi.mock("@/lib/tool-visibility", () => ({
  canUserAccessTool: (...args: unknown[]) => mockCanUserAccessTool(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tokenUsage: {
      create: (...args: unknown[]) => mockTokenUsageCreate(...args),
    },
    tool: {
      findUnique: (...args: unknown[]) => mockToolFindUnique(...args),
    },
    user: { findUnique: vi.fn() },
    toolTable: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    toolRow: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
  },
}));

vi.mock("@/lib/config", () => ({
  getConfig: vi.fn(() => Promise.resolve("")),
  getConfigRequired: vi.fn(() => Promise.resolve("mock")),
}));

import { handleImage, BridgeError } from "./handlers";

const USER_ID = "user-1";

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckQuota.mockResolvedValue({ status: "ok" });
  mockTokenUsageCreate.mockResolvedValue({});
  mockUploadImage.mockResolvedValue(undefined);
  mockGetPresignedUrl.mockImplementation(({ key }: { key: string }) =>
    Promise.resolve(`https://signed.example/${key}`)
  );
  mockToolFindUnique.mockResolvedValue({
    id: "T1",
    authorId: "author",
    visibility: "PUBLIC",
    status: "PUBLISHED",
  });
  mockCanUserAccessTool.mockResolvedValue(true);
});

describe("handleImage / generate", () => {
  it("calls generateFromText with caller userId and returns the result", async () => {
    mockGenerateFromText.mockResolvedValueOnce({
      s3Key: `images/${USER_ID}/abc.png`,
      presignedUrl: "https://signed.example/abc",
      provider: "imagen",
      modelUsed: "imagen-4",
    });

    const result = await handleImage(USER_ID, "generate", {
      prompt: "a red panda",
      provider: "imagen",
      aspectRatio: "16:9",
    });

    expect(mockGenerateFromText).toHaveBeenCalledWith({
      prompt: "a red panda",
      provider: "imagen",
      userId: USER_ID,
      aspectRatio: "16:9",
    });
    expect(result).toEqual({
      s3Key: `images/${USER_ID}/abc.png`,
      presignedUrl: "https://signed.example/abc",
      provider: "imagen",
    });
  });

  it("writes TokenUsage with kind=image, units=1, costUsd from imagePricing", async () => {
    mockGenerateFromText.mockResolvedValueOnce({
      s3Key: `images/${USER_ID}/abc.png`,
      presignedUrl: "u",
      provider: "imagen",
      modelUsed: "imagen-4",
    });

    await handleImage(USER_ID, "generate", { prompt: "x" });

    // Wait for the fire-and-forget create to resolve
    await new Promise((r) => setImmediate(r));

    expect(mockTokenUsageCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: USER_ID,
        kind: "image",
        model: "imagen-4",
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        units: 1,
        costUsd: 0.04,
      }),
    });
  });

  it("defaults provider to imagen when not specified", async () => {
    mockGenerateFromText.mockResolvedValueOnce({
      s3Key: "k", presignedUrl: "u", provider: "imagen", modelUsed: "imagen-4",
    });

    await handleImage(USER_ID, "generate", { prompt: "x" });

    expect(mockGenerateFromText).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "imagen" })
    );
  });

  it("rejects when prompt is missing", async () => {
    await expect(handleImage(USER_ID, "generate", {})).rejects.toMatchObject({
      name: "BridgeError",
      status: 400,
    });
    expect(mockGenerateFromText).not.toHaveBeenCalled();
    expect(mockTokenUsageCreate).not.toHaveBeenCalled();
  });
});

describe("handleImage / edit", () => {
  it("calls generateFromImage when sourceImageKey belongs to caller", async () => {
    mockGenerateFromImage.mockResolvedValueOnce({
      s3Key: `images/${USER_ID}/new.png`,
      presignedUrl: "u",
      provider: "gpt-image",
      modelUsed: "gpt-image-1",
    });

    const result = await handleImage(USER_ID, "edit", {
      prompt: "tweak",
      sourceImageKey: `images/${USER_ID}/old.png`,
      provider: "gpt-image",
    });

    expect(mockGenerateFromImage).toHaveBeenCalledWith({
      prompt: "tweak",
      sourceImageKeys: [`images/${USER_ID}/old.png`],
      provider: "gpt-image",
      userId: USER_ID,
    });
    expect(result.provider).toBe("gpt-image");
  });

  it("rejects sourceImageKey not belonging to caller", async () => {
    await expect(
      handleImage(USER_ID, "edit", {
        prompt: "tweak",
        sourceImageKey: "images/someone-else/old.png",
      })
    ).rejects.toMatchObject({ name: "BridgeError", status: 400 });
    expect(mockGenerateFromImage).not.toHaveBeenCalled();
    expect(mockTokenUsageCreate).not.toHaveBeenCalled();
  });

  it("rejects when sourceImageKey is missing", async () => {
    await expect(
      handleImage(USER_ID, "edit", { prompt: "tweak" })
    ).rejects.toMatchObject({ name: "BridgeError", status: 400 });
    expect(mockGenerateFromImage).not.toHaveBeenCalled();
  });
});

describe("handleImage / common", () => {
  it("rejects unknown action with status 400", async () => {
    await expect(handleImage(USER_ID, "delete", {})).rejects.toMatchObject({
      name: "BridgeError",
      status: 400,
    });
  });

  it("rejects with 403 when quota is blocked", async () => {
    const blockedQuota = {
      status: "blocked",
      monthlyLimitUsd: 50,
      bonusBalanceUsd: 0,
      effectiveLimitUsd: 50,
      currentUsageUsd: 50,
      remainingUsd: 0,
    };
    mockCheckQuota.mockResolvedValueOnce(blockedQuota);

    let captured: BridgeError | undefined;
    await handleImage(USER_ID, "generate", { prompt: "x" }).catch((e: BridgeError) => {
      captured = e;
    });

    expect(captured?.status).toBe(403);
    expect(captured?.body).toEqual({ error: "quota_exceeded", quota: blockedQuota });
    expect(mockGenerateFromText).not.toHaveBeenCalled();
    expect(mockTokenUsageCreate).not.toHaveBeenCalled();
  });

  it("does not bill when generation fails", async () => {
    mockGenerateFromText.mockRejectedValueOnce(new Error("provider down"));

    await expect(
      handleImage(USER_ID, "generate", { prompt: "x" })
    ).rejects.toThrow(/provider down/);

    expect(mockTokenUsageCreate).not.toHaveBeenCalled();
  });
});

// 1x1 transparent PNG (smallest valid PNG)
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

describe("handleImage / upload", () => {
  it("uploads PNG to images/<userId>/ and returns presigned URL", async () => {
    const result = (await handleImage(USER_ID, "upload", {
      base64: TINY_PNG_BASE64,
      mimeType: "image/png",
    })) as { s3Key: string; presignedUrl: string };

    expect(mockUploadImage).toHaveBeenCalledTimes(1);
    const call = mockUploadImage.mock.calls[0][0];
    expect(call.key.startsWith(`images/${USER_ID}/`)).toBe(true);
    expect(call.key.endsWith(".png")).toBe(true);
    expect(call.contentType).toBe("image/png");
    expect(Buffer.isBuffer(call.buffer)).toBe(true);
    expect(result.s3Key).toBe(call.key);
    expect(result.presignedUrl).toContain(call.key);
    expect(mockTokenUsageCreate).not.toHaveBeenCalled();
  });

  it("uses .jpg extension for image/jpeg", async () => {
    await handleImage(USER_ID, "upload", {
      base64: TINY_PNG_BASE64,
      mimeType: "image/jpeg",
    });
    expect(mockUploadImage.mock.calls[0][0].key.endsWith(".jpg")).toBe(true);
  });

  it("rejects missing base64", async () => {
    await expect(
      handleImage(USER_ID, "upload", { mimeType: "image/png" })
    ).rejects.toMatchObject({ name: "BridgeError", status: 400 });
    expect(mockUploadImage).not.toHaveBeenCalled();
  });

  it("rejects missing mimeType", async () => {
    await expect(
      handleImage(USER_ID, "upload", { base64: TINY_PNG_BASE64 })
    ).rejects.toMatchObject({ name: "BridgeError", status: 400 });
    expect(mockUploadImage).not.toHaveBeenCalled();
  });

  it("rejects unsupported MIME with 415", async () => {
    await expect(
      handleImage(USER_ID, "upload", {
        base64: TINY_PNG_BASE64,
        mimeType: "image/gif",
      })
    ).rejects.toMatchObject({ name: "BridgeError", status: 415 });
    expect(mockUploadImage).not.toHaveBeenCalled();
  });

  it("rejects files over 10MB with 413", async () => {
    const big = Buffer.alloc(11 * 1024 * 1024).toString("base64");
    await expect(
      handleImage(USER_ID, "upload", { base64: big, mimeType: "image/png" })
    ).rejects.toMatchObject({ name: "BridgeError", status: 413 });
    expect(mockUploadImage).not.toHaveBeenCalled();
  });

  it("does not check quota for upload", async () => {
    await handleImage(USER_ID, "upload", {
      base64: TINY_PNG_BASE64,
      mimeType: "image/png",
    });
    expect(mockCheckQuota).not.toHaveBeenCalled();
  });
});

describe("handleImage / read", () => {
  const KEY = `images/${USER_ID}/abc.png`;

  it("returns presignedUrl only by default", async () => {
    const result = await handleImage(USER_ID, "read", { s3Key: KEY });

    expect(result).toEqual({
      s3Key: KEY,
      presignedUrl: `https://signed.example/${KEY}`,
    });
    expect(mockGetObjectBuffer).not.toHaveBeenCalled();
  });

  it("returns base64 + mimeType when includeBytes=true", async () => {
    mockGetObjectBuffer.mockResolvedValueOnce(Buffer.from("hello world"));

    const result = (await handleImage(USER_ID, "read", {
      s3Key: KEY,
      includeBytes: true,
    })) as { base64: string; mimeType: string };

    expect(mockGetObjectBuffer).toHaveBeenCalledWith({ key: KEY });
    expect(result.base64).toBe(Buffer.from("hello world").toString("base64"));
    expect(result.mimeType).toBe("image/png");
  });

  it("derives mimeType from extension", async () => {
    mockGetObjectBuffer.mockResolvedValue(Buffer.from(""));

    const r1 = (await handleImage(USER_ID, "read", {
      s3Key: `images/${USER_ID}/x.jpg`,
      includeBytes: true,
    })) as { mimeType: string };
    expect(r1.mimeType).toBe("image/jpeg");

    const r2 = (await handleImage(USER_ID, "read", {
      s3Key: `images/${USER_ID}/x.webp`,
      includeBytes: true,
    })) as { mimeType: string };
    expect(r2.mimeType).toBe("image/webp");
  });

  it("rejects s3Key not owned by caller", async () => {
    await expect(
      handleImage(USER_ID, "read", { s3Key: "images/someone-else/x.png" })
    ).rejects.toMatchObject({ name: "BridgeError", status: 400 });
    expect(mockGetPresignedUrl).not.toHaveBeenCalled();
  });

  it("rejects missing s3Key", async () => {
    await expect(handleImage(USER_ID, "read", {})).rejects.toMatchObject({
      name: "BridgeError",
      status: 400,
    });
  });

  it("maps NoSuchKey to 404", async () => {
    mockGetObjectBuffer.mockRejectedValueOnce(new Error("NoSuchKey: blah"));
    await expect(
      handleImage(USER_ID, "read", { s3Key: KEY, includeBytes: true })
    ).rejects.toMatchObject({ name: "BridgeError", status: 404 });
  });

  it("does not check quota or bill", async () => {
    await handleImage(USER_ID, "read", { s3Key: KEY });
    expect(mockCheckQuota).not.toHaveBeenCalled();
    expect(mockTokenUsageCreate).not.toHaveBeenCalled();
  });
});

describe("handleImage / tool-asset ownership", () => {
  const TOOL_ID = "T1";
  const ASSET_KEY = `tools/${TOOL_ID}/images/logo.png`;
  const OTHER_TOOL_KEY = `tools/T2/images/logo.png`;

  describe("image.edit with tool-asset key", () => {
    it("passes when request toolId matches and caller has access", async () => {
      mockGenerateFromImage.mockResolvedValueOnce({
        s3Key: `images/${USER_ID}/out.png`,
        presignedUrl: "u",
        provider: "imagen",
        modelUsed: "gemini-2.5-flash-image",
      });

      await handleImage(
        USER_ID,
        "edit",
        { prompt: "tweak", sourceImageKey: ASSET_KEY },
        TOOL_ID
      );

      expect(mockCanUserAccessTool).toHaveBeenCalledWith(
        expect.objectContaining({ id: TOOL_ID }),
        USER_ID
      );
      expect(mockGenerateFromImage).toHaveBeenCalledWith(
        expect.objectContaining({ sourceImageKeys: [ASSET_KEY] })
      );
    });

    it("rejects when request toolId does not match the key's toolId", async () => {
      await expect(
        handleImage(
          USER_ID,
          "edit",
          { prompt: "tweak", sourceImageKey: OTHER_TOOL_KEY },
          TOOL_ID
        )
      ).rejects.toMatchObject({ name: "BridgeError", status: 400 });
      expect(mockCanUserAccessTool).not.toHaveBeenCalled();
      expect(mockGenerateFromImage).not.toHaveBeenCalled();
    });

    it("rejects when request has no toolId at all", async () => {
      await expect(
        handleImage(
          USER_ID,
          "edit",
          { prompt: "tweak", sourceImageKey: ASSET_KEY },
          undefined
        )
      ).rejects.toMatchObject({ name: "BridgeError", status: 400 });
      expect(mockCanUserAccessTool).not.toHaveBeenCalled();
    });

    it("rejects when caller has no access to the tool", async () => {
      mockCanUserAccessTool.mockResolvedValueOnce(false);

      await expect(
        handleImage(
          USER_ID,
          "edit",
          { prompt: "tweak", sourceImageKey: ASSET_KEY },
          TOOL_ID
        )
      ).rejects.toMatchObject({ name: "BridgeError", status: 400 });
      expect(mockGenerateFromImage).not.toHaveBeenCalled();
    });

    it("rejects when the tool no longer exists", async () => {
      mockToolFindUnique.mockResolvedValueOnce(null);

      await expect(
        handleImage(
          USER_ID,
          "edit",
          { prompt: "tweak", sourceImageKey: ASSET_KEY },
          TOOL_ID
        )
      ).rejects.toMatchObject({ name: "BridgeError", status: 400 });
    });
  });

  describe("image.read with tool-asset key", () => {
    it("passes when toolId matches and caller has access", async () => {
      const r = (await handleImage(
        USER_ID,
        "read",
        { s3Key: ASSET_KEY },
        TOOL_ID
      )) as { s3Key: string; presignedUrl: string };

      expect(r.s3Key).toBe(ASSET_KEY);
      expect(r.presignedUrl).toContain(ASSET_KEY);
      expect(mockCanUserAccessTool).toHaveBeenCalledWith(
        expect.objectContaining({ id: TOOL_ID }),
        USER_ID
      );
    });

    it("rejects when toolId mismatches", async () => {
      await expect(
        handleImage(USER_ID, "read", { s3Key: OTHER_TOOL_KEY }, TOOL_ID)
      ).rejects.toMatchObject({ name: "BridgeError", status: 400 });
    });

    it("rejects when caller has no access", async () => {
      mockCanUserAccessTool.mockResolvedValueOnce(false);
      await expect(
        handleImage(USER_ID, "read", { s3Key: ASSET_KEY }, TOOL_ID)
      ).rejects.toMatchObject({ name: "BridgeError", status: 400 });
    });
  });
});

describe("handleImage / edit with sourceImageKeys array", () => {
  beforeEach(() => {
    mockGenerateFromImage.mockResolvedValue({
      s3Key: `images/${USER_ID}/out.png`,
      presignedUrl: "u",
      provider: "imagen",
      modelUsed: "gemini-2.5-flash-image",
    });
  });

  it("passes a 2-key array to generateFromImage", async () => {
    await handleImage(USER_ID, "edit", {
      prompt: "compose",
      sourceImageKeys: [
        `images/${USER_ID}/a.png`,
        `images/${USER_ID}/b.png`,
      ],
    });

    expect(mockGenerateFromImage).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceImageKeys: [
          `images/${USER_ID}/a.png`,
          `images/${USER_ID}/b.png`,
        ],
      })
    );
  });

  it("array wins over singular when both are provided", async () => {
    await handleImage(USER_ID, "edit", {
      prompt: "compose",
      sourceImageKey: `images/${USER_ID}/SINGLE.png`,
      sourceImageKeys: [`images/${USER_ID}/A.png`, `images/${USER_ID}/B.png`],
    });

    expect(mockGenerateFromImage).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceImageKeys: [`images/${USER_ID}/A.png`, `images/${USER_ID}/B.png`],
      })
    );
  });

  it("rejects empty array (and no singular key)", async () => {
    await expect(
      handleImage(USER_ID, "edit", { prompt: "x", sourceImageKeys: [] })
    ).rejects.toMatchObject({ name: "BridgeError", status: 400 });
    expect(mockGenerateFromImage).not.toHaveBeenCalled();
  });

  it("rejects arrays over 4 keys", async () => {
    const keys = Array.from({ length: 5 }, (_, i) => `images/${USER_ID}/k${i}.png`);
    await expect(
      handleImage(USER_ID, "edit", { prompt: "x", sourceImageKeys: keys })
    ).rejects.toMatchObject({ name: "BridgeError", status: 400 });
    expect(mockGenerateFromImage).not.toHaveBeenCalled();
  });

  it("rejects entire call when any key fails ownership", async () => {
    await expect(
      handleImage(USER_ID, "edit", {
        prompt: "x",
        sourceImageKeys: [
          `images/${USER_ID}/ok.png`,
          "images/someone-else/bad.png",
        ],
      })
    ).rejects.toMatchObject({ name: "BridgeError", status: 400 });
    expect(mockGenerateFromImage).not.toHaveBeenCalled();
  });

  it("rejects when an array element is not a string", async () => {
    await expect(
      handleImage(USER_ID, "edit", {
        prompt: "x",
        sourceImageKeys: [`images/${USER_ID}/ok.png`, 42],
      })
    ).rejects.toMatchObject({ name: "BridgeError", status: 400 });
    expect(mockGenerateFromImage).not.toHaveBeenCalled();
  });

  it("supports mixing personal and tool-asset keys with valid toolId", async () => {
    const TOOL = "T1";
    await handleImage(
      USER_ID,
      "edit",
      {
        prompt: "compose",
        sourceImageKeys: [
          `images/${USER_ID}/photo.png`,
          `tools/${TOOL}/images/logo.png`,
        ],
      },
      TOOL
    );

    expect(mockGenerateFromImage).toHaveBeenCalledTimes(1);
    expect(mockGenerateFromImage.mock.calls[0][0].sourceImageKeys).toEqual([
      `images/${USER_ID}/photo.png`,
      `tools/${TOOL}/images/logo.png`,
    ]);
  });

  it("bills once regardless of source count", async () => {
    await handleImage(USER_ID, "edit", {
      prompt: "x",
      sourceImageKeys: [
        `images/${USER_ID}/a.png`,
        `images/${USER_ID}/b.png`,
        `images/${USER_ID}/c.png`,
        `images/${USER_ID}/d.png`,
      ],
    });

    // Wait for the fire-and-forget tokenUsage create to resolve
    await new Promise((r) => setImmediate(r));

    expect(mockTokenUsageCreate).toHaveBeenCalledTimes(1);
    expect(mockTokenUsageCreate.mock.calls[0][0].data.units).toBe(1);
  });
});
