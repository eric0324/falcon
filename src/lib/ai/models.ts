import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";

export const models = {
  "claude-sonnet": anthropic("claude-sonnet-4-20250514"),
  "claude-haiku": anthropic("claude-3-5-haiku-20241022"),
  "gpt-4o": openai("gpt-4o"),
  "gpt-4o-mini": openai("gpt-4o-mini"),
  "gemini-flash": google("gemini-2.0-flash"),
  "gemini-pro": google("gemini-2.5-pro"),
} as const;

export type ModelId = keyof typeof models;

export const modelInfo: Record<ModelId, { name: string; description: string }> = {
  "claude-sonnet": {
    name: "Claude Sonnet",
    description: "平衡速度與品質，適合大多數任務",
  },
  "claude-haiku": {
    name: "Claude Haiku",
    description: "快速回應，適合簡單任務",
  },
  "gpt-4o": {
    name: "GPT-4o",
    description: "OpenAI 最新模型，多模態支援",
  },
  "gpt-4o-mini": {
    name: "GPT-4o Mini",
    description: "輕量版 GPT-4o，更快更便宜",
  },
  "gemini-flash": {
    name: "Gemini 2.0 Flash",
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
  "claude-haiku": { input: 0.8, output: 4 },
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gemini-flash": { input: 0.1, output: 0.4 },
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
