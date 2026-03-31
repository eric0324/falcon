import * as XLSX from "xlsx";
import type { Parser, ParsedSegment } from "./types";

export const excelParser: Parser = {
  async parse(buffer: Buffer, fileName: string): Promise<ParsedSegment[]> {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const segments: ParsedSegment[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const text = Object.entries(row)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n");

        if (!text.trim()) continue;

        segments.push({
          text,
          metadata: { source: fileName, sheet: sheetName, row: i + 2 }, // +2 for header + 0-index
        });
      }
    }

    return segments;
  },
};
