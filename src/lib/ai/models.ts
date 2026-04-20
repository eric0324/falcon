import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { getConfigRequired } from "@/lib/config";
import type { LanguageModel } from "ai";

export const MODEL_IDS = [
  "claude-opus-47",
  "claude-opus",
  "claude-sonnet",
  "claude-haiku",
  "gpt-5-mini",
  "gpt-5-nano",
  "gemini-flash",
  "gemini-pro",
] as const;

export type ModelId = (typeof MODEL_IDS)[number];

export const modelInfo: Record<ModelId, { name: string; description: string }> = {
  "claude-opus-47": {
    name: "Claude Opus 4.7",
    description: "最新旗艦模型，軟體工程與複雜推理能力再提升",
  },
  "claude-opus": {
    name: "Claude Opus 4.6",
    description: "上一代旗艦模型，適合複雜推理和長文分析",
  },
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
  "claude-opus-47": { input: 5, output: 25 },
  "claude-opus": { input: 15, output: 75 },
  "claude-sonnet": { input: 3, output: 15 },
  "claude-haiku": { input: 1, output: 5 },
  "gpt-5-mini": { input: 0.25, output: 2 },
  "gpt-5-nano": { input: 0.05, output: 0.4 },
  "gemini-flash": { input: 0.15, output: 0.6 },
  "gemini-pro": { input: 1.25, output: 10 },
};

/** Pricing per generated image in USD (applied to outputTokens as image count) */
export const imagePricing: Record<string, number> = {
  "imagen-4": 0.04,
  "gpt-image-1": 0.04,
  "gemini-2.5-flash-image": 0.03,
};

export interface CacheTokenDetails {
  /** Cache hits — billed at provider-specific discount of input price */
  cacheReadTokens?: number;
  /** Cache writes — billed at provider-specific premium (Anthropic only) */
  cacheWriteTokens?: number;
}

/**
 * Per-provider cache pricing as multipliers of the base input price.
 * - Anthropic: 0.1x read, 1.25x write (ephemeral)
 * - OpenAI:    0.5x read, no separate write cost (automatic)
 * - Google:    0.25x read, no separate write cost (implicit / explicit caching)
 */
const CACHE_MULTIPLIERS: Record<ModelProvider, { read: number; write: number }> = {
  anthropic: { read: 0.1, write: 1.25 },
  openai: { read: 0.5, write: 0 },
  google: { read: 0.25, write: 0 },
};

/** Estimate cost in USD. For image models, `outputTokens` is treated as image count. */
export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cache?: CacheTokenDetails
): number {
  const perImage = imagePricing[model];
  if (perImage !== undefined) {
    return perImage * outputTokens;
  }
  const pricing = modelPricing[model];
  if (!pricing) return 0;
  const cacheRead = cache?.cacheReadTokens ?? 0;
  const cacheWrite = cache?.cacheWriteTokens ?? 0;
  const provider = MODEL_PROVIDER_MAP[model as ModelId]?.provider;
  const mult = provider ? CACHE_MULTIPLIERS[provider] : { read: 1, write: 1 };
  return (
    inputTokens * pricing.input +
    cacheRead * pricing.input * mult.read +
    cacheWrite * pricing.input * mult.write +
    outputTokens * pricing.output
  ) / 1_000_000;
}

export type ModelProvider = "anthropic" | "openai" | "google";

const MODEL_PROVIDER_MAP: Record<ModelId, { provider: ModelProvider; modelName: string }> = {
  "claude-opus-47": { provider: "anthropic", modelName: "claude-opus-4-7" },
  "claude-opus": { provider: "anthropic", modelName: "claude-opus-4-6" },
  "claude-sonnet": { provider: "anthropic", modelName: "claude-sonnet-4-6" },
  "claude-haiku": { provider: "anthropic", modelName: "claude-haiku-4-5-20251001" },
  "gpt-5-mini": { provider: "openai", modelName: "gpt-5-mini" },
  "gpt-5-nano": { provider: "openai", modelName: "gpt-5-nano" },
  "gemini-flash": { provider: "google", modelName: "gemini-2.5-flash" },
  "gemini-pro": { provider: "google", modelName: "gemini-2.5-pro" },
};

export function getModelProvider(modelId: ModelId): ModelProvider {
  return MODEL_PROVIDER_MAP[modelId].provider;
}

export function isAnthropicModel(modelId: ModelId): boolean {
  return getModelProvider(modelId) === "anthropic";
}

/**
 * Default max output tokens per model for the main chat streamText call.
 * Prevents runaway generation; override per call site when a longer cap is needed.
 * Reasoning models (Opus, Pro) get more room for complex answers; smaller models get less.
 */
export const MODEL_MAX_OUTPUT_TOKENS: Record<ModelId, number> = {
  "claude-opus-47": 8192,
  "claude-opus": 8192,
  "claude-sonnet": 8192,
  "claude-haiku": 4096,
  "gpt-5-mini": 4096,
  "gpt-5-nano": 4096,
  "gemini-flash": 8192,
  "gemini-pro": 8192,
};

export function getDefaultMaxOutputTokens(modelId: ModelId): number {
  return MODEL_MAX_OUTPUT_TOKENS[modelId];
}

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
