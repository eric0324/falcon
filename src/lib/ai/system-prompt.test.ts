import { describe, it, expect } from "vitest";
import {
  SYSTEM_PROMPT,
  buildSystemPrompt,
  buildLayeredSystemPrompt,
} from "./system-prompt";

describe("SYSTEM_PROMPT", () => {
  it("should identify as Falcon, not just a tool generator", () => {
    expect(SYSTEM_PROMPT).toContain("Falcon");
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

describe("buildSystemPrompt", () => {
  it("includes current date and time in Taipei timezone", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("Current Time");
    expect(prompt).toContain("台北時間");
    // Should contain the current year
    expect(prompt).toContain(String(new Date().getFullYear()));
  });

  it("omits generateImage guidance when image generation is disabled", () => {
    const withoutDs = buildSystemPrompt();
    const withDs = buildSystemPrompt(["plausible"]);
    for (const prompt of [withoutDs, withDs]) {
      expect(prompt).not.toContain("generateImage");
      expect(prompt).not.toMatch(/sourceImageKey/);
    }
  });

  it("instructs the model to prefer editCode for small changes", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("editCode");
    expect(prompt).toMatch(/prefer editcode/i);
  });

  it("instructs updateCode to preserve existing features", () => {
    const prompt = buildSystemPrompt();
    // Must explicitly warn about preserving code when using updateCode
    expect(prompt).toMatch(/preserve every part/i);
    expect(prompt).toMatch(/do not drop features/i);
  });

  it("includes generateImage guidance when image generation is enabled", () => {
    const withoutDs = buildSystemPrompt(undefined, undefined, true);
    const withDs = buildSystemPrompt(["plausible"], undefined, true);
    for (const prompt of [withoutDs, withDs]) {
      expect(prompt).toContain("generateImage");
      expect(prompt).toMatch(/sourceImageKey/);
    }
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

describe("buildLayeredSystemPrompt — segmentation", () => {
  it("returns three named segments: core, capabilities, volatile", () => {
    const seg = buildLayeredSystemPrompt({});
    expect(seg).toHaveProperty("core");
    expect(seg).toHaveProperty("capabilities");
    expect(seg).toHaveProperty("volatile");
    expect(typeof seg.core).toBe("string");
    expect(typeof seg.capabilities).toBe("string");
    expect(typeof seg.volatile).toBe("string");
  });

  it("Core segment is non-empty and contains BASE_PROMPT identity + always-on bridges", () => {
    const seg = buildLayeredSystemPrompt({});
    expect(seg.core.length).toBeGreaterThan(0);
    expect(seg.core).toContain("You are Falcon");
    expect(seg.core).toContain("companyAPI"); // LLM bridge / scraper bridge reference
    expect(seg.core).toContain("tooldb"); // TOOLDB instructions
    expect(seg.core).toMatch(/scrape/i); // scraper bridge
  });

  it("Current Time appears in Volatile segment, NOT in Core or Capabilities", () => {
    const seg = buildLayeredSystemPrompt({});
    expect(seg.core).not.toContain("Current Time");
    expect(seg.capabilities).not.toContain("Current Time");
    expect(seg.volatile).toContain("Current Time");
    expect(seg.volatile).toContain("台北時間");
  });

  it("Core segment is byte-identical across two builds with same inputs (time-independent)", () => {
    const a = buildLayeredSystemPrompt({ dataSources: ["notion"] });
    const b = buildLayeredSystemPrompt({ dataSources: ["notion"] });
    expect(a.core).toBe(b.core);
  });

  it("Capabilities segment is byte-identical for identical dataSources / imageGenerationEnabled / availableSources", () => {
    const a = buildLayeredSystemPrompt({
      dataSources: ["notion", "slack"],
      availableSources: ["github"],
      imageGenerationEnabled: true,
    });
    const b = buildLayeredSystemPrompt({
      dataSources: ["notion", "slack"],
      availableSources: ["github"],
      imageGenerationEnabled: true,
    });
    expect(a.capabilities).toBe(b.capabilities);
  });

  it("Capabilities segment carries dataSource-specific instructions when selected", () => {
    const seg = buildLayeredSystemPrompt({ dataSources: ["notion"] });
    expect(seg.capabilities).toContain("Notion");
    expect(seg.core).not.toContain("Notion"); // dataSource-specific is NOT in Core
  });

  it("Capabilities segment carries image bridge sections only when imageGenerationEnabled", () => {
    const off = buildLayeredSystemPrompt({});
    const on = buildLayeredSystemPrompt({ imageGenerationEnabled: true });
    expect(off.capabilities).not.toMatch(/generateImage/);
    expect(on.capabilities).toMatch(/generateImage/);
  });

  it("Volatile segment includes volatileExtras when passed", () => {
    const seg = buildLayeredSystemPrompt({ volatileExtras: "\n--- memory ---\nHello world" });
    expect(seg.volatile).toContain("Hello world");
    expect(seg.volatile).toContain("Current Time"); // time still in volatile
  });

  it("Capabilities contains NO_DATA_SOURCE_INSTRUCTIONS when no dataSources / no availableSources / no image", () => {
    const seg = buildLayeredSystemPrompt({});
    // Not byte-empty: the "remind user to select data sources" guidance lives in Capabilities
    expect(seg.capabilities).toContain("No external data sources");
    // But none of the specific dataSource detailed guides appear (use unique tokens, not vendor names —
    // NO_DATA_SOURCE_INSTRUCTIONS mentions "Notion" etc. in its hint sentence)
    expect(seg.capabilities).not.toContain("plausibleQuery");
    expect(seg.capabilities).not.toContain("notionQuery");
    expect(seg.capabilities).not.toMatch(/generateImage/);
  });

  it("buildSystemPrompt (legacy string accessor) equals concatenation of three segments", () => {
    // Note: build at same instant; Volatile contains Current Time (minute granularity)
    const seg = buildLayeredSystemPrompt({ dataSources: ["plausible"] });
    const legacy = buildSystemPrompt(["plausible"]);
    // Compare core + capabilities (time-independent) for byte equality
    expect(legacy.startsWith(seg.core)).toBe(true);
    expect(legacy).toContain(seg.capabilities);
    // Volatile content must also be in legacy (allowing for minute-boundary drift, we check stable substrings)
    expect(legacy).toContain("台北時間");
  });

  it("Three segments concatenated cover all instructions that legacy buildSystemPrompt emits (no missing content)", () => {
    const opts = {
      dataSources: ["notion", "slack", "github"],
      availableSources: ["plausible"],
      imageGenerationEnabled: true,
    };
    const seg = buildLayeredSystemPrompt(opts);
    const combined = seg.core + seg.capabilities + seg.volatile;
    const legacy = buildSystemPrompt(
      opts.dataSources,
      opts.availableSources,
      opts.imageGenerationEnabled
    );
    // Length should match (or differ only by Volatile time-of-day drift if minute rolled over — keep tolerance tiny)
    expect(Math.abs(combined.length - legacy.length)).toBeLessThan(50);
    // Key signal strings must be present in both
    for (const needle of ["Notion", "Slack", "GitHub", "Plausible", "generateImage", "Current Time"]) {
      expect(combined).toContain(needle);
      expect(legacy).toContain(needle);
    }
  });
});
