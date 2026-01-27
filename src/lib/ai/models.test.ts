import { describe, it, expect } from "vitest";

// Mock the AI SDK modules before importing models
vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: (modelId: string) => ({ provider: "anthropic", modelId }),
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: (modelId: string) => ({ provider: "openai", modelId }),
}));

import { models, modelInfo, defaultModel, type ModelId } from "./models";

describe("models", () => {
  it("contains expected model keys", () => {
    const keys = Object.keys(models);
    expect(keys).toContain("claude-sonnet");
    expect(keys).toContain("claude-haiku");
    expect(keys).toContain("gpt-4o");
    expect(keys).toContain("gpt-4o-mini");
  });

  it("has exactly 4 models", () => {
    expect(Object.keys(models)).toHaveLength(4);
  });
});

describe("modelInfo", () => {
  it("has info for every model", () => {
    for (const key of Object.keys(models) as ModelId[]) {
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
    expect(Object.keys(models)).toContain(defaultModel);
  });

  it("is claude-sonnet", () => {
    expect(defaultModel).toBe("claude-sonnet");
  });
});
