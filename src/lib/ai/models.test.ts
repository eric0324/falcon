import { describe, it, expect, vi } from "vitest";

// Mock the AI SDK modules before importing models
vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: ({ apiKey }: { apiKey?: string }) =>
    (modelId: string) => ({ provider: "anthropic", modelId, apiKey }),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: ({ apiKey }: { apiKey?: string }) =>
    (modelId: string) => ({ provider: "openai", modelId, apiKey }),
}));

vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: ({ apiKey }: { apiKey?: string }) =>
    (modelId: string) => ({ provider: "google", modelId, apiKey }),
}));

vi.mock("@/lib/config", () => ({
  getConfig: vi.fn((key: string) => Promise.resolve(`mock-${key}`)),
  getConfigRequired: vi.fn((key: string) => Promise.resolve(`mock-${key}`)),
}));

import {
  MODEL_IDS,
  modelInfo,
  defaultModel,
  getModel,
  estimateCost,
  imagePricing,
  audioPricing,
  embeddingPricing,
  getModelProvider,
  isAnthropicModel,
  getDefaultMaxOutputTokens,
  MODEL_MAX_OUTPUT_TOKENS,
} from "./models";

describe("MODEL_IDS", () => {
  it("contains expected model keys", () => {
    expect(MODEL_IDS).toContain("claude-opus-47");
    expect(MODEL_IDS).toContain("claude-opus");
    expect(MODEL_IDS).toContain("claude-sonnet");
    expect(MODEL_IDS).toContain("claude-haiku");
    expect(MODEL_IDS).toContain("gpt-5-mini");
    expect(MODEL_IDS).toContain("gpt-5-nano");
    expect(MODEL_IDS).toContain("gemini-flash");
    expect(MODEL_IDS).toContain("gemini-pro");
  });

  it("has exactly 8 models", () => {
    expect(MODEL_IDS).toHaveLength(8);
  });
});

describe("getModel", () => {
  it("returns anthropic model for claude-haiku", async () => {
    const model = await getModel("claude-haiku") as unknown as { provider: string; modelId: string };
    expect(model.provider).toBe("anthropic");
    expect(model.modelId).toBe("claude-haiku-4-5-20251001");
  });

  it("returns openai model for gpt-5-mini", async () => {
    const model = await getModel("gpt-5-mini") as unknown as { provider: string; modelId: string };
    expect(model.provider).toBe("openai");
    expect(model.modelId).toBe("gpt-5-mini");
  });

  it("returns google model for gemini-flash", async () => {
    const model = await getModel("gemini-flash") as unknown as { provider: string; modelId: string };
    expect(model.provider).toBe("google");
    expect(model.modelId).toBe("gemini-2.5-flash");
  });
});

describe("modelInfo", () => {
  it("has info for every model", () => {
    for (const key of MODEL_IDS) {
      expect(modelInfo[key]).toBeDefined();
      expect(modelInfo[key].name).toBeTruthy();
      expect(modelInfo[key].description).toBeTruthy();
    }
  });

  it("each model has name and description strings", () => {
    for (const info of Object.values(modelInfo)) {
      expect(typeof info.name).toBe("string");
      expect(typeof info.description).toBe("string");
    }
  });
});

describe("defaultModel", () => {
  it("is a valid ModelId", () => {
    expect(MODEL_IDS).toContain(defaultModel);
  });

  it("is claude-haiku", () => {
    expect(defaultModel).toBe("claude-haiku");
  });
});

describe("estimateCost (chat)", () => {
  it("computes per-1M-token cost", () => {
    // claude-haiku: input $1, output $5 per 1M tokens
    expect(
      estimateCost({ kind: "chat", model: "claude-haiku", inputTokens: 1_000_000, outputTokens: 0 })
    ).toBeCloseTo(1, 5);
    expect(
      estimateCost({ kind: "chat", model: "claude-haiku", inputTokens: 0, outputTokens: 1_000_000 })
    ).toBeCloseTo(5, 5);
  });

  it("returns 0 for unknown model", () => {
    expect(
      estimateCost({ kind: "chat", model: "unknown-model", inputTokens: 1000, outputTokens: 1000 })
    ).toBe(0);
  });

  it("subtracts cache tokens from inputTokens before applying base price", () => {
    // claude-haiku: input $1/M. Caller passes raw API total inputTokens=1_000_000
    // which INCLUDES 1_000_000 of cacheRead. So nonCachedInput = 0.
    // Cost = 0 base + 1M × $1 × 0.1 (Anthropic cache read multiplier) = $0.10
    expect(
      estimateCost({
        kind: "chat",
        model: "claude-haiku",
        inputTokens: 1_000_000,
        outputTokens: 0,
        cacheReadTokens: 1_000_000,
      })
    ).toBeCloseTo(0.1, 5);
  });

  it("applies 1.25x premium on cache write tokens (Anthropic)", () => {
    // inputTokens = cacheWriteTokens = 1M → nonCachedInput = 0
    // Cost = 1M × $1 × 1.25 = $1.25
    expect(
      estimateCost({
        kind: "chat",
        model: "claude-haiku",
        inputTokens: 1_000_000,
        outputTokens: 0,
        cacheWriteTokens: 1_000_000,
      })
    ).toBeCloseTo(1.25, 5);
  });

  it("sums non-cached, cacheRead, cacheWrite and output correctly", () => {
    // Raw API inputTokens = 1.5M (= 0.5M non-cached + 0.5M cacheRead + 0.5M cacheWrite)
    // Output = 0.5M
    // Cost = 0.5 × 1 + 0.5 × 1 × 0.1 + 0.5 × 1 × 1.25 + 0.5 × 5
    //      = 0.5 + 0.05 + 0.625 + 2.5 = 3.675
    expect(
      estimateCost({
        kind: "chat",
        model: "claude-haiku",
        inputTokens: 1_500_000,
        outputTokens: 500_000,
        cacheReadTokens: 500_000,
        cacheWriteTokens: 500_000,
      })
    ).toBeCloseTo(3.675, 5);
  });

  it("treats missing cache options as zero", () => {
    expect(
      estimateCost({ kind: "chat", model: "claude-haiku", inputTokens: 1_000_000, outputTokens: 0 })
    ).toBeCloseTo(1, 5);
  });

  it("applies 0.5x discount for OpenAI cache reads", () => {
    // gpt-5-mini: input $0.25/M. inputTokens includes the 1M cacheRead.
    // Cost = 0 base + 1M × $0.25 × 0.5 = $0.125
    expect(
      estimateCost({
        kind: "chat",
        model: "gpt-5-mini",
        inputTokens: 1_000_000,
        outputTokens: 0,
        cacheReadTokens: 1_000_000,
      })
    ).toBeCloseTo(0.125, 5);
  });

  it("ignores cacheWrite for OpenAI (no separate write cost)", () => {
    expect(
      estimateCost({
        kind: "chat",
        model: "gpt-5-mini",
        inputTokens: 1_000_000,
        outputTokens: 0,
        cacheWriteTokens: 1_000_000,
      })
    ).toBe(0);
  });

  it("applies 0.25x discount for Google Gemini cache reads", () => {
    // gemini-flash: input $0.15/M
    // Cost = 1M × $0.15 × 0.25 = $0.0375
    expect(
      estimateCost({
        kind: "chat",
        model: "gemini-flash",
        inputTokens: 1_000_000,
        outputTokens: 0,
        cacheReadTokens: 1_000_000,
      })
    ).toBeCloseTo(0.0375, 5);
  });

  it("ignores cacheWrite for Gemini", () => {
    expect(
      estimateCost({
        kind: "chat",
        model: "gemini-flash",
        inputTokens: 1_000_000,
        outputTokens: 0,
        cacheWriteTokens: 1_000_000,
      })
    ).toBe(0);
  });

  it("Anthropic applies 0.1x read / 1.25x write", () => {
    // claude-opus-47: input $5/M
    expect(
      estimateCost({
        kind: "chat",
        model: "claude-opus-47",
        inputTokens: 2_000_000,
        outputTokens: 0,
        cacheReadTokens: 1_000_000,
        cacheWriteTokens: 1_000_000,
      })
    ).toBeCloseTo(5 * 0.1 + 5 * 1.25, 5);
  });
});

describe("estimateCost (audio)", () => {
  it("computes per-minute cost", () => {
    expect(estimateCost({ kind: "audio", model: "gpt-4o-mini-transcribe", minutes: 2 })).toBeCloseTo(
      audioPricing["gpt-4o-mini-transcribe"] * 2,
      5
    );
    expect(estimateCost({ kind: "audio", model: "whisper-1", minutes: 1 })).toBe(
      audioPricing["whisper-1"]
    );
  });

  it("returns 0 for unknown audio model", () => {
    expect(estimateCost({ kind: "audio", model: "unknown-audio", minutes: 5 })).toBe(0);
  });
});

describe("estimateCost (image)", () => {
  it("computes per-image cost", () => {
    expect(estimateCost({ kind: "image", model: "imagen-4", imageCount: 1 })).toBe(
      imagePricing["imagen-4"]
    );
    expect(estimateCost({ kind: "image", model: "gpt-image-1", imageCount: 3 })).toBeCloseTo(
      imagePricing["gpt-image-1"] * 3,
      5
    );
  });

  it("returns 0 for unknown image model", () => {
    expect(estimateCost({ kind: "image", model: "unknown-image", imageCount: 1 })).toBe(0);
  });
});

describe("estimateCost (embedding)", () => {
  it("computes per-1M-input-token cost", () => {
    expect(
      estimateCost({ kind: "embedding", model: "voyage-3", inputTokens: 1_000_000 })
    ).toBeCloseTo(embeddingPricing["voyage-3"], 5);
    expect(
      estimateCost({ kind: "embedding", model: "voyage-3-lite", inputTokens: 500_000 })
    ).toBeCloseTo(embeddingPricing["voyage-3-lite"] * 0.5, 5);
  });

  it("returns 0 for unknown embedding model", () => {
    expect(
      estimateCost({ kind: "embedding", model: "unknown-embed", inputTokens: 1000 })
    ).toBe(0);
  });
});

describe("imagePricing", () => {
  it("has entries for imagen-4, gpt-image-1 and gemini-2.5-flash-image", () => {
    expect(imagePricing["imagen-4"]).toBeGreaterThan(0);
    expect(imagePricing["gpt-image-1"]).toBeGreaterThan(0);
    expect(imagePricing["gemini-2.5-flash-image"]).toBeGreaterThan(0);
  });
});

describe("getModelProvider", () => {
  it("returns anthropic for all claude models", () => {
    expect(getModelProvider("claude-opus-47")).toBe("anthropic");
    expect(getModelProvider("claude-opus")).toBe("anthropic");
    expect(getModelProvider("claude-sonnet")).toBe("anthropic");
    expect(getModelProvider("claude-haiku")).toBe("anthropic");
  });

  it("returns openai for gpt models", () => {
    expect(getModelProvider("gpt-5-mini")).toBe("openai");
    expect(getModelProvider("gpt-5-nano")).toBe("openai");
  });

  it("returns google for gemini models", () => {
    expect(getModelProvider("gemini-flash")).toBe("google");
    expect(getModelProvider("gemini-pro")).toBe("google");
  });
});

describe("getDefaultMaxOutputTokens", () => {
  it("returns a positive integer for every ModelId", () => {
    for (const id of MODEL_IDS) {
      const cap = getDefaultMaxOutputTokens(id);
      expect(Number.isInteger(cap)).toBe(true);
      expect(cap).toBeGreaterThan(0);
    }
  });

  it("claude-haiku caps at 8192", () => {
    expect(getDefaultMaxOutputTokens("claude-haiku")).toBe(8192);
  });

  it("claude-opus-47 allows longer output than haiku", () => {
    expect(getDefaultMaxOutputTokens("claude-opus-47")).toBeGreaterThanOrEqual(
      getDefaultMaxOutputTokens("claude-haiku")
    );
  });

  it("matches MODEL_MAX_OUTPUT_TOKENS table", () => {
    for (const id of MODEL_IDS) {
      expect(getDefaultMaxOutputTokens(id)).toBe(MODEL_MAX_OUTPUT_TOKENS[id]);
    }
  });
});

describe("isAnthropicModel", () => {
  it("is true for claude models", () => {
    expect(isAnthropicModel("claude-opus-47")).toBe(true);
    expect(isAnthropicModel("claude-haiku")).toBe(true);
  });

  it("is false for non-anthropic models", () => {
    expect(isAnthropicModel("gpt-5-mini")).toBe(false);
    expect(isAnthropicModel("gemini-pro")).toBe(false);
  });
});
