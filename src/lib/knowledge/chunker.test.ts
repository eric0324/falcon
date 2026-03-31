import { describe, it, expect } from "vitest";
import { chunkSegments } from "./chunker";
import type { ParsedSegment } from "./parsers";

describe("chunkSegments", () => {
  it("should pass through short segments unchanged", () => {
    const segments: ParsedSegment[] = [
      { text: "Hello world", metadata: { source: "test.csv", row: 2 } },
    ];
    const chunks = chunkSegments(segments);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe("Hello world");
  });

  it("should split by headings", () => {
    const text = `# 第一章：總則
這是第一章的內容。

## 1.1 適用範圍
適用於所有員工。

## 1.2 生效日期
自 2026 年 1 月 1 日起生效。

# 第二章：請假規定
這是第二章的內容。`;

    const segments: ParsedSegment[] = [
      { text, metadata: { source: "policy.pdf", page: 1 } },
    ];
    const chunks = chunkSegments(segments);

    // h1 and h2 split, h3 stays within section
    expect(chunks).toHaveLength(4);
    expect(chunks[0].text).toContain("第一章");
    expect(chunks[1].text).toContain("1.1 適用範圍");
    expect(chunks[2].text).toContain("1.2 生效日期");
    expect(chunks[3].text).toContain("第二章");
  });

  it("should keep text without headings as one chunk if short", () => {
    const text = "這是一段沒有標題的文字，應該保持完整。";
    const segments: ParsedSegment[] = [
      { text, metadata: { source: "note.txt" } },
    ];
    const chunks = chunkSegments(segments);
    expect(chunks).toHaveLength(1);
  });

  it("should split long text without headings by sentence", () => {
    const longText = Array(100).fill("這是一段很長的文字，需要被切割成多個部分。").join("");
    const segments: ParsedSegment[] = [
      { text: longText, metadata: { source: "test.pdf", page: 1 } },
    ];
    const chunks = chunkSegments(segments);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("should handle empty input", () => {
    expect(chunkSegments([])).toEqual([]);
  });

  it("should skip empty text segments", () => {
    const segments: ParsedSegment[] = [
      { text: "", metadata: { source: "test.csv", row: 2 } },
      { text: "  ", metadata: { source: "test.csv", row: 3 } },
      { text: "valid", metadata: { source: "test.csv", row: 4 } },
    ];
    const chunks = chunkSegments(segments);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe("valid");
  });

  it("should keep CSV rows as individual chunks", () => {
    const segments: ParsedSegment[] = [
      { text: "name: Alice\nage: 30", metadata: { source: "test.csv", row: 2 } },
      { text: "name: Bob\nage: 25", metadata: { source: "test.csv", row: 3 } },
    ];
    const chunks = chunkSegments(segments);
    expect(chunks).toHaveLength(2);
  });
});
