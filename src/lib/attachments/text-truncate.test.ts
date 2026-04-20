import { describe, it, expect } from "vitest";
import { truncateHead, truncateCsvSmart } from "./text-truncate";

describe("truncateHead", () => {
  it("returns text unchanged when within budget", () => {
    const text = "hello world";
    const result = truncateHead(text, 10_000);
    expect(result.text).toBe(text);
    expect(result.truncated).toBe(false);
    expect(result.originalLines).toBe(1);
    expect(result.keptLines).toBe(1);
  });

  it("truncates when token estimate exceeds budget", () => {
    const text = Array.from({ length: 1000 }, (_, i) => `line ${i}`).join("\n");
    const result = truncateHead(text, 100); // tiny budget
    expect(result.truncated).toBe(true);
    expect(result.keptLines).toBeLessThan(result.originalLines);
    expect(result.keptLines).toBeGreaterThan(0);
  });

  it("appends a truncation marker when truncated", () => {
    const text = Array.from({ length: 1000 }, (_, i) => `line ${i}`).join("\n");
    const result = truncateHead(text, 100);
    expect(result.text).toMatch(/已截斷/);
    expect(result.text).toMatch(/原始/);
  });

  it("does not append marker when no truncation happens", () => {
    const result = truncateHead("short", 1000);
    expect(result.text).not.toMatch(/已截斷/);
  });

  it("returns at least one line for non-empty input even with tiny budget", () => {
    const text = "a\nb\nc";
    const result = truncateHead(text, 0);
    expect(result.keptLines).toBeGreaterThanOrEqual(1);
  });

  it("originalLines reflects total input lines", () => {
    const text = "a\nb\nc\nd";
    const result = truncateHead(text, 1_000);
    expect(result.originalLines).toBe(4);
  });
});

describe("truncateCsvSmart", () => {
  it("returns text unchanged when within budget", () => {
    const text = "name,age\nA,1\nB,2";
    const result = truncateCsvSmart(text, 10_000);
    expect(result.text).toBe(text);
    expect(result.truncated).toBe(false);
  });

  it("preserves the header row when truncating", () => {
    const header = "id,name,value";
    const rows = Array.from({ length: 1000 }, (_, i) => `${i},name${i},${i * 10}`);
    const text = [header, ...rows].join("\n");
    const result = truncateCsvSmart(text, 200);
    expect(result.truncated).toBe(true);
    expect(result.text.startsWith(header)).toBe(true);
    expect(result.keptLines).toBeLessThan(result.originalLines);
  });

  it("counts header in originalLines", () => {
    const text = "h\na\nb\nc";
    const result = truncateCsvSmart(text, 1_000);
    expect(result.originalLines).toBe(4);
  });

  it("appends truncation marker mentioning header retention", () => {
    const header = "h";
    const rows = Array.from({ length: 500 }, (_, i) => `r${i}`);
    const result = truncateCsvSmart([header, ...rows].join("\n"), 50);
    expect(result.truncated).toBe(true);
    expect(result.text).toMatch(/已截斷/);
    expect(result.text).toMatch(/header|標題列/);
  });

  it("handles empty input gracefully", () => {
    const result = truncateCsvSmart("", 1_000);
    expect(result.truncated).toBe(false);
    expect(result.text).toBe("");
  });
});
