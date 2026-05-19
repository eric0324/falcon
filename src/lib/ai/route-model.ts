import type { ModelId } from "./models";

const HIGH_TIER_ANTHROPIC_MODELS = new Set<ModelId>([
  "claude-opus-47",
  "claude-opus",
  "claude-sonnet",
]);

export const UPGRADE_KEYWORDS = [
  // Code / tool generation
  "寫",
  "改",
  "修改",
  "修正",
  "修",
  "實作",
  "建立",
  "建置",
  "生成",
  "做一個",
  "開發",
  "程式",
  "程式碼",
  "代碼",
  "工具",
  "元件",
  "code",
  "coding",
  "implement",
  "build",
  "create",
  "fix",
  "debug",
  "bug",
  "error",
  "refactor",
  "react",
  "component",
  "tailwind",
  "api",
  "database",
  "sql",
  // Analysis / planning / design
  "分析",
  "報告",
  "比較",
  "設計",
  "架構",
  "規劃",
  "企劃",
  "策略",
  "analyze",
  "analysis",
  "compare",
  "report",
  "design",
  "architecture",
  "plan",
  // Image / media
  "圖片",
  "圖像",
  "畫",
  "image",
  "photo",
];

export type ModelRoutingReason =
  | "selected_haiku"
  | "not_high_tier_anthropic"
  | "has_files"
  | "has_tool_history"
  | "long_message"
  | "complex_keyword"
  | "short_simple_query";

export interface ModelRoutingInput {
  userMessage: string;
  selectedModel: ModelId;
  hasFiles: boolean;
  hasToolHistory: boolean;
}

export interface ModelRoutingDecision {
  model: ModelId;
  routed: boolean;
  reason: ModelRoutingReason;
}

const SIMPLE_QUERY_MAX_CHARS = 200;

function hasUpgradeKeyword(message: string): boolean {
  const normalized = message.toLowerCase();
  return UPGRADE_KEYWORDS.some((keyword) =>
    normalized.includes(keyword.toLowerCase())
  );
}

export function getModelRoutingDecision(
  input: ModelRoutingInput
): ModelRoutingDecision {
  const selectedModel = input.selectedModel;

  if (selectedModel === "claude-haiku") {
    return { model: selectedModel, routed: false, reason: "selected_haiku" };
  }

  if (!HIGH_TIER_ANTHROPIC_MODELS.has(selectedModel)) {
    return {
      model: selectedModel,
      routed: false,
      reason: "not_high_tier_anthropic",
    };
  }

  if (input.hasFiles) {
    return { model: selectedModel, routed: false, reason: "has_files" };
  }

  if (input.hasToolHistory) {
    return { model: selectedModel, routed: false, reason: "has_tool_history" };
  }

  if (input.userMessage.length >= SIMPLE_QUERY_MAX_CHARS) {
    return { model: selectedModel, routed: false, reason: "long_message" };
  }

  if (hasUpgradeKeyword(input.userMessage)) {
    return { model: selectedModel, routed: false, reason: "complex_keyword" };
  }

  return {
    model: "claude-haiku",
    routed: true,
    reason: "short_simple_query",
  };
}

export function routeModel(input: ModelRoutingInput): ModelId {
  return getModelRoutingDecision(input).model;
}
