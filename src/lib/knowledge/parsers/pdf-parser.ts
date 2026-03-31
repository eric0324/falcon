import type { Parser, ParsedSegment } from "./types";

export const pdfParser: Parser = {
  async parse(buffer: Buffer, fileName: string): Promise<ParsedSegment[]> {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = parser as any;
    await p.load();
    const result = await p.getText() as { pages: { text: string }[]; text: string };

    const segments: ParsedSegment[] = [];

    // Use per-page text if available
    if (result.pages?.length) {
      for (let i = 0; i < result.pages.length; i++) {
        const text = result.pages[i].text?.trim();
        if (!text) continue;
        segments.push({
          text,
          metadata: { source: fileName, page: i + 1 },
        });
      }
    } else if (result.text) {
      // Fallback: split full text by form feed
      const pages = result.text.split(/\f/);
      for (let i = 0; i < pages.length; i++) {
        const text = pages[i].trim();
        if (!text) continue;
        segments.push({
          text,
          metadata: { source: fileName, page: i + 1 },
        });
      }
    }

    return segments;
  },
};
