import { describe, it, expect } from "vitest";
import { SYSTEM_PROMPT } from "./system-prompt";

describe("SYSTEM_PROMPT", () => {
  it("should identify as a Studio assistant, not just a tool generator", () => {
    expect(SYSTEM_PROMPT).toContain("Studio Assistant");
  });

  it("should support general conversation", () => {
    expect(SYSTEM_PROMPT).toContain("answer questions");
    expect(SYSTEM_PROMPT).toContain("analyze data");
  });

  it("should mention code generation as conditional, not mandatory", () => {
    expect(SYSTEM_PROMPT).toMatch(/explicitly requests.*(?:UI|tool)/i);
  });

  it("should list available tools", () => {
    expect(SYSTEM_PROMPT).toContain("updateCode");
  });

  it("should instruct to respond in Traditional Chinese", () => {
    expect(SYSTEM_PROMPT).toContain("Traditional Chinese (Taiwan)");
  });

  it("should prohibit data fabrication", () => {
    expect(SYSTEM_PROMPT).toContain("Never fabricate data");
  });
});
