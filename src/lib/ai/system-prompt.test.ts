import { describe, it, expect } from "vitest";
import { SYSTEM_PROMPT } from "./system-prompt";

describe("SYSTEM_PROMPT", () => {
  it("should identify as a Studio assistant, not just a tool generator", () => {
    expect(SYSTEM_PROMPT).toContain("Studio");
    // Should NOT position itself as only a tool generator
    expect(SYSTEM_PROMPT).not.toMatch(/^你是一個內部工具產生器助手/);
  });

  it("should support general conversation", () => {
    expect(SYSTEM_PROMPT).toContain("回答問題");
    expect(SYSTEM_PROMPT).toContain("分析資料");
  });

  it("should mention code generation as conditional, not mandatory", () => {
    // Code rules should be under a conditional section
    expect(SYSTEM_PROMPT).toMatch(/當.*(?:需要|要求|明確).*(?:UI|介面|工具|程式碼)/);
  });

  it("should list available tools", () => {
    expect(SYSTEM_PROMPT).toContain("updateCode");
  });

  it("should instruct to use updateCode tool for code submission", () => {
    expect(SYSTEM_PROMPT).toContain("updateCode");
  });

  it("should instruct to respond in Traditional Chinese", () => {
    expect(SYSTEM_PROMPT).toContain("繁體中文");
  });
});
