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

describe("buildSystemPrompt with Meta Ads", () => {
  it("includes Meta Ads guide when meta_ads is selected", () => {
    const prompt = buildSystemPrompt(["meta_ads"]);
    expect(prompt).toContain("Meta Ads");
    expect(prompt).toContain("metaAdsQuery");
    expect(prompt).toContain("listAccounts");
    expect(prompt).toContain("overview");
    expect(prompt).toContain("campaigns");
    expect(prompt).toContain("timeseries");
    expect(prompt).toContain("breakdown");
    expect(prompt).toContain("accountId");
  });

  it("does not include Meta Ads guide when not selected", () => {
    const prompt = buildSystemPrompt(["notion"]);
    expect(prompt).not.toContain("Meta Ads");
    expect(prompt).not.toContain("metaAdsQuery");
  });
});

describe("buildSystemPrompt with GitHub", () => {
  it("includes GitHub guide when github is selected", () => {
    const prompt = buildSystemPrompt(["github"]);
    expect(prompt).toContain("GitHub");
    expect(prompt).toContain("githubQuery");
    expect(prompt).toContain("listRepos");
    expect(prompt).toContain("listPRs");
    expect(prompt).toContain("readPR");
    expect(prompt).toContain("searchCode");
    expect(prompt).toContain("commits");
  });

  it("does not include GitHub guide when not selected", () => {
    const prompt = buildSystemPrompt(["notion"]);
    expect(prompt).not.toContain("githubQuery");
  });
});
