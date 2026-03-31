import type { ParsedSegment } from "./parsers";

const MAX_CHUNK_CHARS = 1500; // if a section is still too long, split further
const OVERLAP_CHARS = 150;

/**
 * Split text by headings (# ## ###) into sections.
 * Each section includes its heading as context.
 */
function splitByHeadings(text: string): string[] {
  // Split on lines that start with # (markdown headings)
  const lines = text.split("\n");
  const sections: string[] = [];
  let current = "";

  for (const line of lines) {
    if (/^#{1,2}\s/.test(line) && current.trim()) {
      // New heading found — push current section
      sections.push(current.trim());
      current = line + "\n";
    } else {
      current += line + "\n";
    }
  }

  if (current.trim()) {
    sections.push(current.trim());
  }

  return sections;
}

/**
 * For sections that are still too long (no sub-headings),
 * split by sentence boundaries with overlap.
 */
function splitLongSection(text: string, metadata: ParsedSegment["metadata"]): ParsedSegment[] {
  if (text.length <= MAX_CHUNK_CHARS) {
    return [{ text, metadata: { ...metadata } }];
  }

  // Split by sentence-ending punctuation
  const sentences = text.split(/(?<=[\n。！？；])/);
  const chunks: ParsedSegment[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (current.length + sentence.length > MAX_CHUNK_CHARS && current.length > 0) {
      chunks.push({ text: current.trim(), metadata: { ...metadata } });
      const overlapStart = Math.max(0, current.length - OVERLAP_CHARS);
      current = current.slice(overlapStart) + sentence;
    } else {
      current += sentence;
    }
  }

  if (current.trim()) {
    chunks.push({ text: current.trim(), metadata: { ...metadata } });
  }

  return chunks;
}

export function chunkSegments(segments: ParsedSegment[]): ParsedSegment[] {
  const chunks: ParsedSegment[] = [];

  for (const segment of segments) {
    const text = segment.text.trim();
    if (!text) continue;

    // Check if text has headings
    const hasHeadings = /^#{1,2}\s/m.test(text);

    if (!hasHeadings) {
      // No headings — split by size if needed
      chunks.push(...splitLongSection(text, segment.metadata));
    } else {
      // Split by headings, then handle long sections
      const sections = splitByHeadings(text);
      for (const section of sections) {
        chunks.push(...splitLongSection(section, segment.metadata));
      }
    }
  }

  return chunks;
}
