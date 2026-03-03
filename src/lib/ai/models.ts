import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";

export const models = {
  "claude-sonnet": anthropic("claude-sonnet-4-6-20250217"),
  "claude-haiku": anthropic("claude-haiku-4-5-20251001"),
  "gpt-5-mini": openai("gpt-5-mini"),
  "gpt-5-nano": openai("gpt-5-nano"),
  "gemini-flash": google("gemini-2.5-flash"),
  "gemini-pro": google("gemini-2.5-pro"),
} as const;

export type ModelId = keyof typeof models;

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
