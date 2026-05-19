import { describe, expect, it } from "vitest";
import { getModelRoutingDecision, routeModel } from "./route-model";

describe("routeModel", () => {
  it("downgrades a short simple query from Opus 4.7 to Haiku", () => {
    expect(
      routeModel({
        userMessage: "今天天氣如何？",
        selectedModel: "claude-opus-47",
        hasFiles: false,
        hasToolHistory: false,
      })
    ).toBe("claude-haiku");
  });

  it("downgrades a short simple query from Sonnet to Haiku", () => {
    const decision = getModelRoutingDecision({
      userMessage: "幫我翻成英文",
      selectedModel: "claude-sonnet",
      hasFiles: false,
      hasToolHistory: false,
    });

    expect(decision).toEqual({
      model: "claude-haiku",
      routed: true,
      reason: "short_simple_query",
    });
  });

  it("keeps Haiku when the user selected Haiku", () => {
    expect(
      getModelRoutingDecision({
        userMessage: "簡單說明一下",
        selectedModel: "claude-haiku",
        hasFiles: false,
        hasToolHistory: false,
      })
    ).toMatchObject({ model: "claude-haiku", routed: false, reason: "selected_haiku" });
  });

  it("skips non-Anthropic models", () => {
    expect(
      getModelRoutingDecision({
        userMessage: "hello",
        selectedModel: "gpt-5-mini",
        hasFiles: false,
        hasToolHistory: false,
      })
    ).toMatchObject({
      model: "gpt-5-mini",
      routed: false,
      reason: "not_high_tier_anthropic",
    });
  });

  it("keeps the selected model when files are attached", () => {
    expect(
      getModelRoutingDecision({
        userMessage: "摘要這個檔案",
        selectedModel: "claude-opus",
        hasFiles: true,
        hasToolHistory: false,
      })
    ).toMatchObject({ model: "claude-opus", routed: false, reason: "has_files" });
  });

  it("keeps the selected model when the conversation already has tool history", () => {
    expect(
      getModelRoutingDecision({
        userMessage: "繼續",
        selectedModel: "claude-sonnet",
        hasFiles: false,
        hasToolHistory: true,
      })
    ).toMatchObject({
      model: "claude-sonnet",
      routed: false,
      reason: "has_tool_history",
    });
  });

  it("keeps the selected model for long messages", () => {
    expect(
      getModelRoutingDecision({
        userMessage: "a".repeat(200),
        selectedModel: "claude-opus-47",
        hasFiles: false,
        hasToolHistory: false,
      })
    ).toMatchObject({
      model: "claude-opus-47",
      routed: false,
      reason: "long_message",
    });
  });

  it.each([
    "幫我寫一個 todo list",
    "幫我改這個工具",
    "請分析這份報告",
    "build a dashboard",
    "debug this React component",
    "generate image for the hero",
  ])("keeps selected model for complex keyword: %s", (userMessage) => {
    expect(
      getModelRoutingDecision({
        userMessage,
        selectedModel: "claude-sonnet",
        hasFiles: false,
        hasToolHistory: false,
      })
    ).toMatchObject({
      model: "claude-sonnet",
      routed: false,
      reason: "complex_keyword",
    });
  });
});
