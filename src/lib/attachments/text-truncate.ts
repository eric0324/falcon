import { estimateTokens } from "@/lib/ai/token-utils";

export interface TruncateResult {
  text: string;
  truncated: boolean;
  originalLines: number;
  keptLines: number;
}

function buildMarker(originalLines: number, originalChars: number, keptLines: number, kind: "head" | "csv"): string {
  const note = kind === "csv" ? "（保留 header + 前段）" : "";
  return `\n[... 已截斷${note}：原始 ${originalLines} 行 / ${originalChars} 字元，保留前 ${keptLines} 行]`;
}

/**
 * Truncate text from the head, keeping as many leading lines as fit within maxTokens.
 * Always keeps at least one line for non-empty input.
 */
export function truncateHead(text: string, maxTokens: number): TruncateResult {
  if (estimateTokens(text) <= maxTokens) {
    return {
      text,
      truncated: false,
      originalLines: text === "" ? 0 : text.split("\n").length,
      keptLines: text === "" ? 0 : text.split("\n").length,
    };
  }

  const lines = text.split("\n");
  const originalLines = lines.length;
  const originalChars = text.length;

  // Reserve budget for the marker itself.
  const markerSample = buildMarker(originalLines, originalChars, originalLines, "head");
  const reserve = estimateTokens(markerSample);
  const usable = Math.max(0, maxTokens - reserve);

  let keptLines = 0;
  let acc = "";
  for (const line of lines) {
    const candidate = keptLines === 0 ? line : `${acc}\n${line}`;
    if (estimateTokens(candidate) > usable && keptLines >= 1) break;
    acc = candidate;
    keptLines++;
  }

  if (keptLines === 0) {
    keptLines = 1;
    acc = lines[0];
  }

  return {
    text: acc + buildMarker(originalLines, originalChars, keptLines, "head"),
    truncated: true,
    originalLines,
    keptLines,
  };
}

/**
 * CSV-aware truncation: always preserve the first line (header) and keep as many
 * subsequent rows as fit within maxTokens.
 */
export function truncateCsvSmart(text: string, maxTokens: number): TruncateResult {
  if (text === "") {
    return { text: "", truncated: false, originalLines: 0, keptLines: 0 };
  }
  if (estimateTokens(text) <= maxTokens) {
    const lineCount = text.split("\n").length;
    return { text, truncated: false, originalLines: lineCount, keptLines: lineCount };
  }

  const lines = text.split("\n");
  const originalLines = lines.length;
  const originalChars = text.length;
  const header = lines[0];

  const markerSample = buildMarker(originalLines, originalChars, originalLines, "csv");
  const reserve = estimateTokens(markerSample);
  const usable = Math.max(0, maxTokens - reserve);

  let acc = header;
  let keptLines = 1;
  for (let i = 1; i < lines.length; i++) {
    const candidate = `${acc}\n${lines[i]}`;
    if (estimateTokens(candidate) > usable) break;
    acc = candidate;
    keptLines++;
  }

  return {
    text: acc + buildMarker(originalLines, originalChars, keptLines, "csv"),
    truncated: true,
    originalLines,
    keptLines,
  };
}
