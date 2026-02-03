import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";

export const models = {
  "claude-sonnet": anthropic("claude-sonnet-4-20250514"),
  "claude-haiku": anthropic("claude-3-5-haiku-20241022"),
  "gpt-4o": openai("gpt-4o"),
  "gpt-4o-mini": openai("gpt-4o-mini"),
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
};

export const defaultModel: ModelId = "claude-haiku";
