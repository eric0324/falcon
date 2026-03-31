import { pdfParser } from "./pdf-parser";
import { excelParser } from "./excel-parser";
import { csvParser } from "./csv-parser";
import type { Parser } from "./types";

export type { ParsedSegment, Parser } from "./types";

const parsers: Record<string, Parser> = {
  pdf: pdfParser,
  xlsx: excelParser,
  xls: excelParser,
  csv: csvParser,
};

export function getParser(fileType: string): Parser | null {
  return parsers[fileType.toLowerCase()] ?? null;
}
