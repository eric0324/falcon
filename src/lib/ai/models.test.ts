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
}));

import { MODEL_IDS, modelInfo, defaultModel, getModel, type ModelId } from "./models";

describe("MODEL_IDS", () => {
  it("contains expected model keys", () => {
    expect(MODEL_IDS).toContain("claude-sonnet");
    expect(MODEL_IDS).toContain("claude-haiku");
    expect(MODEL_IDS).toContain("gpt-5-mini");
    expect(MODEL_IDS).toContain("gpt-5-nano");
    expect(MODEL_IDS).toContain("gemini-flash");
    expect(MODEL_IDS).toContain("gemini-pro");
  });

  it("has exactly 6 models", () => {
    expect(MODEL_IDS).toHaveLength(6);
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
