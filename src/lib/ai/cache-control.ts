import { isAnthropicModel, type ModelId } from "./models";

const EPHEMERAL = {
  anthropic: { cacheControl: { type: "ephemeral" as const } },
};

export type CacheableSystem =
  | string
  | {
      role: "system";
      content: string;
      providerOptions: typeof EPHEMERAL;
    };

export function cacheableSystem(text: string, modelId: ModelId): CacheableSystem {
  if (!isAnthropicModel(modelId)) return text;
  return {
    role: "system",
    content: text,
    providerOptions: EPHEMERAL,
  };
}

export function cacheableTools<T extends Record<string, unknown>>(
  tools: T,
  modelId: ModelId
): T {
  if (!isAnthropicModel(modelId)) return tools;
  const keys = Object.keys(tools);
  if (keys.length === 0) return tools;

  const lastKey = keys[keys.length - 1];
  const lastTool = tools[lastKey];

  return {
    ...tools,
    [lastKey]: {
      ...(lastTool as object),
      providerOptions: EPHEMERAL,
    },
  } as T;
}
