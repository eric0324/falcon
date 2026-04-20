import { describe, it, expect } from "vitest";
import {
  WARN_TOKENS,
  HARD_TOKENS,
  classifyAttachmentSize,
} from "./limits";

describe("attachment limits", () => {
  it("WARN_TOKENS is 8000", () => {
    expect(WARN_TOKENS).toBe(8_000);
  });

  it("HARD_TOKENS is 32000", () => {
    expect(HARD_TOKENS).toBe(32_000);
  });

  it("HARD_TOKENS is greater than WARN_TOKENS", () => {
    expect(HARD_TOKENS).toBeGreaterThan(WARN_TOKENS);
  });
});

describe("classifyAttachmentSize", () => {
  it("returns ok for tokens under WARN", () => {
    expect(classifyAttachmentSize(0)).toBe("ok");
    expect(classifyAttachmentSize(WARN_TOKENS - 1)).toBe("ok");
  });

  it("returns warn at WARN threshold", () => {
    expect(classifyAttachmentSize(WARN_TOKENS)).toBe("warn");
    expect(classifyAttachmentSize(HARD_TOKENS - 1)).toBe("warn");
  });

  it("returns reject at HARD threshold", () => {
    expect(classifyAttachmentSize(HARD_TOKENS)).toBe("reject");
    expect(classifyAttachmentSize(HARD_TOKENS * 10)).toBe("reject");
  });
});
