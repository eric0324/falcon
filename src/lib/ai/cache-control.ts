import { isAnthropicModel, type ModelId } from "./models";

const EPHEMERAL = {
  anthropic: { cacheControl: { type: "ephemeral" as const } },
};

export type SystemSegments = {
  core: string;
  capabilities: string;
  volatile: string;
};

type SystemMessage = {
  role: "system";
  content: string;
  providerOptions?: typeof EPHEMERAL;
};

export type CacheableSystem = string | SystemMessage | SystemMessage[];

function isSegments(input: string | SystemSegments): input is SystemSegments {
  return typeof input === "object" && input !== null && "core" in input;
}

export function cacheableSystem(
  input: string | SystemSegments,
  modelId: ModelId
): CacheableSystem {
  if (isSegments(input)) {
    const { core, capabilities, volatile } = input;

    if (!isAnthropicModel(modelId)) {
      // OpenAI / Gemini: concatenated string in stability order.
      return [core, capabilities, volatile].filter(Boolean).join("");
    }

    // Anthropic: one SystemModelMessage per non-empty segment.
    // The @ai-sdk/anthropic plugin merges consecutive system messages into a
    // single API-level `system: [{type:"text", text, cache_control}, ...]`
    // with one cache_control breakpoint per message's providerOptions.
    const messages: SystemMessage[] = [];
    if (core) messages.push({ role: "system", content: core, providerOptions: EPHEMERAL });
    if (capabilities)
      messages.push({ role: "system", content: capabilities, providerOptions: EPHEMERAL });
    if (volatile) messages.push({ role: "system", content: volatile });

    return messages;
  }

  // Legacy single-string signature
  if (!isAnthropicModel(modelId)) return input;
  return {
    role: "system",
    content: input,
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
