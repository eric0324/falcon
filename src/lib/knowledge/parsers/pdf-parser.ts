import type { Parser, ParsedSegment } from "./types";

export const pdfParser: Parser = {
  async parse(buffer: Buffer, fileName: string): Promise<ParsedSegment[]> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string }>;
    const data = await pdfParse(buffer);

    // Split by pages using form feed or double newline as page boundary
    const pages = data.text.split(/\f/);
    const segments: ParsedSegment[] = [];

    for (let i = 0; i < pages.length; i++) {
      const text = pages[i].trim();
      if (!text) continue;

      segments.push({
        text,
        metadata: { source: fileName, page: i + 1 },
      });
    }

    return segments;
  },
};
