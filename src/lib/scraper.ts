import * as cheerio from "cheerio";

const MAX_TEXT_LENGTH = 8000;
const FETCH_TIMEOUT_MS = 10000;

const REMOVE_SELECTORS = [
  "script", "style", "noscript", "iframe", "svg",
  "nav", "footer", "header",
  "[role='navigation']", "[role='banner']", "[role='contentinfo']",
  ".cookie-banner", ".popup", ".modal", ".ad", ".advertisement",
];

export interface ScrapeResult {
  url: string;
  title: string;
  text: string;
  truncated: boolean;
}

/**
 * Fetch a URL and extract clean text content.
 */
export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FalconBot/1.0)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    const html = await res.text();
    return parseHtml(html, url);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Parse HTML and extract clean text.
 */
export function parseHtml(html: string, url: string): ScrapeResult {
  const $ = cheerio.load(html);

  // Remove noisy elements
  for (const selector of REMOVE_SELECTORS) {
    $(selector).remove();
  }

  const title = $("title").text().trim() || $("h1").first().text().trim() || url;

  // Extract text from body
  let text = $("body").text();

  // Clean up whitespace: collapse multiple spaces/newlines
  text = text
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const truncated = text.length > MAX_TEXT_LENGTH;
  if (truncated) {
    text = text.slice(0, MAX_TEXT_LENGTH) + "\n\n[Content truncated]";
  }

  return { url, title, text, truncated };
}
