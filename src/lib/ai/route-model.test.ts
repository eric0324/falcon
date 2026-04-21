import { describe, it, expect } from "vitest";
import { routeModel } from "./route-model";

const base = {
  hasFiles: false,
  hasToolHistory: false,
};

describe("routeModel — downgrade conditions", () => {
  it("downgrades short simple query on opus-47", () => {
    expect(
      routeModel({
        userMessage: "今天天氣如何",
        selectedModel: "claude-opus-47",
        ...base,
      })
    ).toBe("claude-haiku");
  });

  it("downgrades short query on opus", () => {
    expect(
      routeModel({
        userMessage: "幫我查一下上週的營收",
        selectedModel: "claude-opus",
        ...base,
      })
    ).toBe("claude-haiku");
  });

  it("downgrades short query on sonnet", () => {
    expect(
      routeModel({
        userMessage: "hello there",
        selectedModel: "claude-sonnet",
        ...base,
      })
    ).toBe("claude-haiku");
  });
});

describe("routeModel — upgrade keepers", () => {
  it("keeps model when message contains code keyword (寫)", () => {
    expect(
      routeModel({
        userMessage: "幫我寫一個 todo list 應用",
        selectedModel: "claude-opus-47",
        ...base,
      })
    ).toBe("claude-opus-47");
  });

  it("keeps model when message contains code keyword (改)", () => {
    expect(
      routeModel({
        userMessage: "幫我改一下這個按鈕的顏色",
        selectedModel: "claude-opus",
        ...base,
      })
    ).toBe("claude-opus");
  });

  it("keeps model when message contains 程式", () => {
    expect(
      routeModel({
        userMessage: "程式有問題",
        selectedModel: "claude-sonnet",
        ...base,
      })
    ).toBe("claude-sonnet");
  });

  it("keeps model when message contains English 'code'", () => {
    expect(
      routeModel({
        userMessage: "review this code",
        selectedModel: "claude-opus-47",
        ...base,
      })
    ).toBe("claude-opus-47");
  });

  it("keeps model when message contains 分析", () => {
    expect(
      routeModel({
        userMessage: "分析一下這份資料",
        selectedModel: "claude-opus",
        ...base,
      })
    ).toBe("claude-opus");
  });

  it("keeps model when message contains 報告", () => {
    expect(
      routeModel({
        userMessage: "生一份報告給我",
        selectedModel: "claude-opus-47",
        ...base,
      })
    ).toBe("claude-opus-47");
  });

  it("keeps model when message contains 設計", () => {
    expect(
      routeModel({
        userMessage: "設計一個登入頁",
        selectedModel: "claude-opus-47",
        ...base,
      })
    ).toBe("claude-opus-47");
  });

  it("keeps model when message is long (>= 200 chars)", () => {
    const longMsg = "這是一段很長的訊息，".repeat(30);
    expect(
      routeModel({
        userMessage: longMsg,
        selectedModel: "claude-opus",
        ...base,
      })
    ).toBe("claude-opus");
  });

  it("keeps model when files are attached", () => {
    expect(
      routeModel({
        userMessage: "看看這個",
        selectedModel: "claude-opus-47",
        hasFiles: true,
        hasToolHistory: false,
      })
    ).toBe("claude-opus-47");
  });

  it("keeps model when conversation has prior tool calls", () => {
    expect(
      routeModel({
        userMessage: "接下來呢",
        selectedModel: "claude-opus",
        hasFiles: false,
        hasToolHistory: true,
      })
    ).toBe("claude-opus");
  });
});

describe("routeModel — no-op cases", () => {
  it("returns claude-haiku when already claude-haiku", () => {
    expect(
      routeModel({
        userMessage: "今天天氣如何",
        selectedModel: "claude-haiku",
        ...base,
      })
    ).toBe("claude-haiku");
  });

  it("does not route non-Anthropic models (gpt-5-mini)", () => {
    expect(
      routeModel({
        userMessage: "今天天氣如何",
        selectedModel: "gpt-5-mini",
        ...base,
      })
    ).toBe("gpt-5-mini");
  });

  it("does not route non-Anthropic models (gemini-pro)", () => {
    expect(
      routeModel({
        userMessage: "hi",
        selectedModel: "gemini-pro",
        ...base,
      })
    ).toBe("gemini-pro");
  });
});

describe("routeModel — edge cases", () => {
  it("keeps model on empty userMessage (conservative)", () => {
    expect(
      routeModel({
        userMessage: "",
        selectedModel: "claude-opus",
        ...base,
      })
    ).toBe("claude-opus");
  });

  it("case-insensitive English keyword match", () => {
    expect(
      routeModel({
        userMessage: "Build me a form",
        selectedModel: "claude-opus-47",
        ...base,
      })
    ).toBe("claude-opus-47");
  });

  it("keeps when message mentions 畫圖 (image generation intent)", () => {
    expect(
      routeModel({
        userMessage: "畫一隻貓",
        selectedModel: "claude-opus-47",
        ...base,
      })
    ).toBe("claude-opus-47");
  });
});
