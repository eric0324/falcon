import type { ParsedSegment } from "./parsers";

const TARGET_CHUNK_SIZE = 500; // approximate tokens (~words for CJK-mixed)
const OVERLAP_SIZE = 100;

function estimateTokens(text: string): number {
  // Rough estimate: 1 word ≈ 1 token for English, 1 char ≈ 1 token for CJK
  const words = text.split(/\s+/).filter(Boolean);
  return words.length;
}

function splitTextIntoChunks(
  text: string,
  metadata: ParsedSegment["metadata"]
): ParsedSegment[] {
  const words = text.split(/\s+/).filter(Boolean);

  if (words.length <= TARGET_CHUNK_SIZE) {
    return [{ text, metadata }];
  }

  const chunks: ParsedSegment[] = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + TARGET_CHUNK_SIZE, words.length);
    const chunkText = words.slice(start, end).join(" ");

    chunks.push({ text: chunkText, metadata: { ...metadata } });

    // Move forward by (chunk size - overlap)
    start += TARGET_CHUNK_SIZE - OVERLAP_SIZE;

    // Avoid tiny trailing chunks
    if (start + OVERLAP_SIZE >= words.length) break;
  }

  return chunks;
}

export function chunkSegments(segments: ParsedSegment[]): ParsedSegment[] {
  const chunks: ParsedSegment[] = [];

  for (const segment of segments) {
    const text = segment.text.trim();
    if (!text) continue;

    const tokens = estimateTokens(text);

    if (tokens <= TARGET_CHUNK_SIZE) {
      chunks.push({ text, metadata: segment.metadata });
    } else {
      chunks.push(...splitTextIntoChunks(text, segment.metadata));
    }
  }

  return chunks;
}
