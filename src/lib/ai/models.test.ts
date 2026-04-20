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

describe("estimateCost", () => {
  it("computes per-1M-token cost for text models", () => {
    // claude-haiku: input $1, output $5 per 1M tokens
    expect(estimateCost("claude-haiku", 1_000_000, 0)).toBeCloseTo(1, 5);
    expect(estimateCost("claude-haiku", 0, 1_000_000)).toBeCloseTo(5, 5);
  });

  it("computes per-image cost for image models", () => {
    // outputTokens is the image count for image models
    expect(estimateCost("imagen-4", 0, 1)).toBe(imagePricing["imagen-4"]);
    expect(estimateCost("gpt-image-1", 0, 3)).toBeCloseTo(
      imagePricing["gpt-image-1"] * 3,
      5
    );
  });

  it("returns 0 for unknown model", () => {
    expect(estimateCost("unknown-model", 1000, 1000)).toBe(0);
  });

  it("applies 0.1x discount on cached input tokens (cacheRead)", () => {
    // claude-haiku: input $1/M, output $5/M
    // 1M cacheRead = 1M × $1 × 0.1 = $0.10
    expect(
      estimateCost("claude-haiku", 0, 0, { cacheReadTokens: 1_000_000 })
    ).toBeCloseTo(0.1, 5);
  });

  it("applies 1.25x premium on cache write tokens (cacheCreation)", () => {
    // 1M cacheWrite = 1M × $1 × 1.25 = $1.25
    expect(
      estimateCost("claude-haiku", 0, 0, { cacheWriteTokens: 1_000_000 })
    ).toBeCloseTo(1.25, 5);
  });

  it("sums non-cached, cached and creation correctly", () => {
    // 0.5M non-cached + 0.5M cacheRead + 0.5M cacheWrite + 0.5M output
    // = 0.5 × 1 + 0.5 × 1 × 0.1 + 0.5 × 1 × 1.25 + 0.5 × 5
    // = 0.5 + 0.05 + 0.625 + 2.5 = 3.675
    expect(
      estimateCost("claude-haiku", 500_000, 500_000, {
        cacheReadTokens: 500_000,
        cacheWriteTokens: 500_000,
      })
    ).toBeCloseTo(3.675, 5);
  });

  it("ignores cache options for image models", () => {
    expect(
      estimateCost("imagen-4", 0, 1, { cacheReadTokens: 999 })
    ).toBe(imagePricing["imagen-4"]);
  });

  it("treats missing cache options as zero (backward compatible)", () => {
    expect(estimateCost("claude-haiku", 1_000_000, 0)).toBeCloseTo(1, 5);
  });

  it("applies 0.5x discount for OpenAI cache reads", () => {
    // gpt-5-mini: input $0.25/M
    // 1M cacheRead = 1M × $0.25 × 0.5 = $0.125
    expect(
      estimateCost("gpt-5-mini", 0, 0, { cacheReadTokens: 1_000_000 })
    ).toBeCloseTo(0.125, 5);
  });

  it("ignores cacheWrite for OpenAI (no separate write cost)", () => {
    // OpenAI does not bill cache writes separately; treat cacheWrite as zero impact
    expect(
      estimateCost("gpt-5-mini", 0, 0, {
        cacheReadTokens: 0,
        cacheWriteTokens: 1_000_000,
      })
    ).toBe(0);
  });

  it("applies 0.25x discount for Google Gemini cache reads", () => {
    // gemini-flash: input $0.15/M
    // 1M cacheRead = 1M × $0.15 × 0.25 = $0.0375
    expect(
      estimateCost("gemini-flash", 0, 0, { cacheReadTokens: 1_000_000 })
    ).toBeCloseTo(0.0375, 5);
  });

  it("ignores cacheWrite for Gemini (implicit caching has no write cost)", () => {
    expect(
      estimateCost("gemini-flash", 0, 0, { cacheWriteTokens: 1_000_000 })
    ).toBe(0);
  });

  it("Anthropic still applies 0.1x read / 1.25x write", () => {
    expect(
      estimateCost("claude-opus-47", 0, 0, {
        cacheReadTokens: 1_000_000,
        cacheWriteTokens: 1_000_000,
      })
    ).toBeCloseTo(5 * 0.1 + 5 * 1.25, 5);
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

  it("claude-haiku caps at 4096", () => {
    expect(getDefaultMaxOutputTokens("claude-haiku")).toBe(4096);
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
