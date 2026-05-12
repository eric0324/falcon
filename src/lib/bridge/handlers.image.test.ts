import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGenerateFromText = vi.fn();
const mockGenerateFromImage = vi.fn();
const mockCheckQuota = vi.fn();
const mockTokenUsageCreate = vi.fn();

vi.mock("@/lib/ai/image-generation", () => ({
  generateFromText: (...args: unknown[]) => mockGenerateFromText(...args),
  generateFromImage: (...args: unknown[]) => mockGenerateFromImage(...args),
}));

vi.mock("@/lib/quota", () => ({
  checkQuota: (...args: unknown[]) => mockCheckQuota(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tokenUsage: {
      create: (...args: unknown[]) => mockTokenUsageCreate(...args),
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
      sourceImageKey: `images/${USER_ID}/old.png`,
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
