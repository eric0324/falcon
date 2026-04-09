import { tool } from "ai";
import { z } from "zod";
import { scrapeUrl } from "@/lib/scraper";

export function createScraperTools() {
  return {
    webScrape: tool({
      description:
        "Fetch a web page and extract its text content. Use this when the user provides a URL or asks about a specific web page.",
      inputSchema: z.object({
        url: z.string().url().describe("The URL to scrape"),
      }),
      execute: async ({ url }) => {
        try {
          const result = await scrapeUrl(url);
          return {
            success: true,
            ...result,
          };
        } catch (error) {
          return {
            success: false,
            url,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),
  };
}
