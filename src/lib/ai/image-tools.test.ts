import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGenerateFromText = vi.fn();
const mockGenerateFromImage = vi.fn();
vi.mock("./image-generation", () => ({
  generateFromText: (...args: unknown[]) => mockGenerateFromText(...args),
  generateFromImage: (...args: unknown[]) => mockGenerateFromImage(...args),
}));

const mockTokenUsageCreate = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    tokenUsage: { create: (...args: unknown[]) => mockTokenUsageCreate(...args) },
  },
}));

import { createImageTools } from "./image-tools";

describe("createImageTools / generateImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTokenUsageCreate.mockResolvedValue({});
  });

  it("calls generateFromText when no sourceImageKey is given", async () => {
    mockGenerateFromText.mockResolvedValue({
      s3Key: "images/u/test.png",
      presignedUrl: "https://signed",
      provider: "imagen",
      modelUsed: "imagen-4",
    });

    const tools = createImageTools({
      userId: "u",
      conversationId: "c",
      defaultProvider: "imagen",
    });

    const result = await tools.generateImage.execute!(
      { prompt: "a cat" },
      // @ts-expect-error execute options not relevant for test
      {}
    );

    expect(mockGenerateFromText).toHaveBeenCalledWith({
      prompt: "a cat",
      provider: "imagen",
      userId: "u",
    });
    expect(mockGenerateFromImage).not.toHaveBeenCalled();
    expect(result).toEqual({
      type: "image_generated",
      s3Key: "images/u/test.png",
      presignedUrl: "https://signed",
      provider: "imagen",
    });
  });

  it("calls generateFromImage when sourceImageKey is given", async () => {
    mockGenerateFromImage.mockResolvedValue({
      s3Key: "images/u/new.png",
      presignedUrl: "https://signed2",
      provider: "gpt-image",
      modelUsed: "gpt-image-1",
    });

    const tools = createImageTools({
      userId: "u",
      conversationId: "c",
      defaultProvider: "gpt-image",
    });

    const result = await tools.generateImage.execute!(
      { prompt: "remove bg", sourceImageKey: "images/u/src.png" },
      // @ts-expect-error execute options not relevant for test
      {}
    );

    expect(mockGenerateFromImage).toHaveBeenCalledWith({
      prompt: "remove bg",
      sourceImageKey: "images/u/src.png",
      provider: "gpt-image",
      userId: "u",
    });
    expect(result).toMatchObject({ type: "image_generated", provider: "gpt-image" });
  });

  it("prefers the tool call provider over the default", async () => {
    mockGenerateFromText.mockResolvedValue({
      s3Key: "k",
      presignedUrl: "u",
      provider: "gpt-image",
      modelUsed: "gpt-image-1",
    });

    const tools = createImageTools({
      userId: "u",
      conversationId: "c",
      defaultProvider: "imagen",
    });

    await tools.generateImage.execute!(
      { prompt: "x", provider: "gpt-image" },
      // @ts-expect-error execute options not relevant for test
      {}
    );

    expect(mockGenerateFromText).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "gpt-image" })
    );
  });

  it("writes TokenUsage on success with outputTokens=1 and cost from imagePricing", async () => {
    mockGenerateFromText.mockResolvedValue({
      s3Key: "k",
      presignedUrl: "u",
      provider: "imagen",
      modelUsed: "imagen-4",
    });

    const tools = createImageTools({
      userId: "user-42",
      conversationId: "conv-1",
      defaultProvider: "imagen",
    });

    await tools.generateImage.execute!(
      { prompt: "x" },
      // @ts-expect-error execute options not relevant for test
      {}
    );

    expect(mockTokenUsageCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-42",
        model: "imagen-4",
        inputTokens: 0,
        outputTokens: 1,
        totalTokens: 1,
        costUsd: 0.04,
      }),
    });
  });

  it("returns image_error when generation fails and does NOT write TokenUsage", async () => {
    mockGenerateFromText.mockRejectedValue(new Error("content filtered"));

    const tools = createImageTools({
      userId: "u",
      conversationId: "c",
      defaultProvider: "imagen",
    });

    const result = await tools.generateImage.execute!(
      { prompt: "x" },
      // @ts-expect-error execute options not relevant for test
      {}
    );

    expect(result).toEqual({
      type: "image_error",
      reason: "content filtered",
    });
    expect(mockTokenUsageCreate).not.toHaveBeenCalled();
  });

  it("does not throw when TokenUsage insert fails", async () => {
    mockGenerateFromText.mockResolvedValue({
      s3Key: "k",
      presignedUrl: "u",
      provider: "imagen",
      modelUsed: "imagen-4",
    });
    mockTokenUsageCreate.mockRejectedValue(new Error("DB down"));

    const tools = createImageTools({
      userId: "u",
      conversationId: "c",
      defaultProvider: "imagen",
    });

    const result = await tools.generateImage.execute!(
      { prompt: "x" },
      // @ts-expect-error execute options not relevant for test
      {}
    );

    expect(result).toMatchObject({ type: "image_generated" });
  });
});
