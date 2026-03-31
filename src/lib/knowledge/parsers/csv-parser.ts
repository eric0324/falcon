import { parse } from "csv-parse/sync";
import type { Parser, ParsedSegment } from "./types";

export const csvParser: Parser = {
  async parse(buffer: Buffer, fileName: string): Promise<ParsedSegment[]> {
    const records = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];

    const segments: ParsedSegment[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const text = Object.entries(row)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");

      if (!text.trim()) continue;

      segments.push({
        text,
        metadata: { source: fileName, row: i + 2 },
      });
    }

    return segments;
  },
};
