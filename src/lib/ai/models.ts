import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { getConfigRequired } from "@/lib/config";
import type { LanguageModel } from "ai";

export const MODEL_IDS = [
  "claude-sonnet",
  "claude-haiku",
  "gpt-5-mini",
  "gpt-5-nano",
  "gemini-flash",
  "gemini-pro",
] as const;

export type ModelId = (typeof MODEL_IDS)[number];

export const modelInfo: Record<ModelId, { name: string; description: string }> = {
  "claude-sonnet": {
    name: "Claude Sonnet 4.6",
    description: "平衡速度與品質，適合大多數任務",
  },
  "claude-haiku": {
    name: "Claude Haiku 4.5",
    description: "快速回應，適合簡單任務",
  },
  "gpt-5-mini": {
    name: "GPT-5 Mini",
    description: "OpenAI 快速推理模型，性價比高",
  },
  "gpt-5-nano": {
    name: "GPT-5 Nano",
    description: "極速極便宜，適合簡單任務",
  },
  "gemini-flash": {
    name: "Gemini 2.5 Flash",
    description: "Google 快速模型，適合即時任務",
  },
  "gemini-pro": {
    name: "Gemini 2.5 Pro",
    description: "Google 最強模型，複雜推理能力",
  },
};

export const defaultModel: ModelId = "claude-haiku";

/** Pricing per 1M tokens in USD */
export const modelPricing: Record<string, { input: number; output: number }> = {
  "claude-sonnet": { input: 3, output: 15 },
  "claude-haiku": { input: 1, output: 5 },
  "gpt-5-mini": { input: 0.25, output: 2 },
  "gpt-5-nano": { input: 0.05, output: 0.4 },
  "gemini-flash": { input: 0.15, output: 0.6 },
  "gemini-pro": { input: 1.25, output: 10 },
};

/** Estimate cost in USD from token counts and model name */
export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = modelPricing[model];
  if (!pricing) return 0;
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

const MODEL_PROVIDER_MAP: Record<ModelId, { provider: "anthropic" | "openai" | "google"; modelName: string }> = {
  "claude-sonnet": { provider: "anthropic", modelName: "claude-sonnet-4-6" },
  "claude-haiku": { provider: "anthropic", modelName: "claude-haiku-4-5-20251001" },
  "gpt-5-mini": { provider: "openai", modelName: "gpt-5-mini" },
  "gpt-5-nano": { provider: "openai", modelName: "gpt-5-nano" },
  "gemini-flash": { provider: "google", modelName: "gemini-2.5-flash" },
  "gemini-pro": { provider: "google", modelName: "gemini-2.5-pro" },
};

/**
 * Get an AI model instance by ID. Reads API keys from DB/env dynamically.
 */
export async function getModel(modelId: ModelId): Promise<LanguageModel> {
  const { provider, modelName } = MODEL_PROVIDER_MAP[modelId];

  const KEY_MAP = {
    anthropic: "ANTHROPIC_API_KEY",
    openai: "OPENAI_API_KEY",
    google: "GOOGLE_GENERATIVE_AI_API_KEY",
  } as const;

  const apiKey = await getConfigRequired(KEY_MAP[provider]);

  switch (provider) {
    case "anthropic":
      return createAnthropic({ apiKey })(modelName);
    case "openai":
      return createOpenAI({ apiKey })(modelName);
    case "google":
      return createGoogleGenerativeAI({ apiKey })(modelName);
  }
}
