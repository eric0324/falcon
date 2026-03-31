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
    expect(chunks[0].metadata.source).toBe("test.csv");
  });

  it("should split long text into chunks with overlap", () => {
    // Create a long text (~600 words, well over 500 token target)
    const longText = Array(600).fill("word").join(" ");
    const segments: ParsedSegment[] = [
      { text: longText, metadata: { source: "test.pdf", page: 1 } },
    ];
    const chunks = chunkSegments(segments);
    expect(chunks.length).toBeGreaterThan(1);

    // All chunks should have metadata
    for (const chunk of chunks) {
      expect(chunk.metadata.source).toBe("test.pdf");
      expect(chunk.metadata.page).toBe(1);
    }
  });

  it("should create overlap between adjacent chunks", () => {
    const words = Array(800).fill(0).map((_, i) => `w${i}`);
    const longText = words.join(" ");
    const segments: ParsedSegment[] = [
      { text: longText, metadata: { source: "test.pdf", page: 1 } },
    ];
    const chunks = chunkSegments(segments);

    // Check that consecutive chunks share some content (overlap)
    if (chunks.length >= 2) {
      const wordsFirst = chunks[0].text.split(" ");
      const wordsSecond = chunks[1].text.split(" ");
      // The last OVERLAP_SIZE words of chunk 1 should appear at the start of chunk 2
      const tailOfFirst = wordsFirst.slice(-100).join(" ");
      const headOfSecond = wordsSecond.slice(0, 100).join(" ");
      expect(headOfSecond).toBe(tailOfFirst);
    }
  });

  it("should handle empty input", () => {
    const chunks = chunkSegments([]);
    expect(chunks).toEqual([]);
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

  it("should keep Excel/CSV rows as individual chunks", () => {
    const segments: ParsedSegment[] = [
      { text: "name: Alice\nage: 30", metadata: { source: "test.csv", row: 2 } },
      { text: "name: Bob\nage: 25", metadata: { source: "test.csv", row: 3 } },
    ];
    const chunks = chunkSegments(segments);
    expect(chunks).toHaveLength(2);
  });
});
