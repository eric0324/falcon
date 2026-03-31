export interface ParsedSegment {
  text: string;
  metadata: {
    source: string;
    page?: number;
    sheet?: string;
    row?: number;
  };
}

export interface Parser {
  parse(buffer: Buffer, fileName: string): Promise<ParsedSegment[]>;
}
