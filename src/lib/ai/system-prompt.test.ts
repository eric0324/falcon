import { describe, it, expect } from "vitest";
import { SYSTEM_PROMPT, buildSystemPrompt } from "./system-prompt";

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

describe("buildSystemPrompt with Plausible", () => {
  it("includes Plausible guide when plausible is selected", () => {
    const prompt = buildSystemPrompt(["plausible"]);
    expect(prompt).toContain("Plausible Analytics");
    expect(prompt).toContain("plausibleQuery");
    expect(prompt).toContain("realtime");
    expect(prompt).toContain("aggregate");
    expect(prompt).toContain("timeseries");
    expect(prompt).toContain("breakdown");
  });

  it("does not include Plausible guide when not selected", () => {
    const prompt = buildSystemPrompt(["notion"]);
    expect(prompt).not.toContain("Plausible Analytics");
    expect(prompt).not.toContain("plausibleQuery");
  });
});

describe("buildSystemPrompt with GA4", () => {
  it("includes GA4 guide when ga4 is selected", () => {
    const prompt = buildSystemPrompt(["ga4"]);
    expect(prompt).toContain("Google Analytics 4");
    expect(prompt).toContain("ga4Query");
    expect(prompt).toContain("realtime");
    expect(prompt).toContain("aggregate");
    expect(prompt).toContain("timeseries");
    expect(prompt).toContain("breakdown");
  });

  it("does not include GA4 guide when not selected", () => {
    const prompt = buildSystemPrompt(["notion"]);
    expect(prompt).not.toContain("Google Analytics 4");
    expect(prompt).not.toContain("ga4Query");
  });
});
