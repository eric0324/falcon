import { describe, it, expect } from "vitest";
import { parseHtml } from "./scraper";

describe("parseHtml", () => {
  it("extracts title and text from simple HTML", () => {
    const html = `
      <html>
        <head><title>Test Page</title></head>
        <body><p>Hello world</p></body>
      </html>
    `;
    const result = parseHtml(html, "https://example.com");
    expect(result.title).toBe("Test Page");
    expect(result.text).toContain("Hello world");
    expect(result.url).toBe("https://example.com");
    expect(result.truncated).toBe(false);
  });

  it("removes script and style tags", () => {
    const html = `
      <html>
        <body>
          <script>alert('xss')</script>
          <style>.foo { color: red }</style>
          <p>Clean content</p>
        </body>
      </html>
    `;
    const result = parseHtml(html, "https://example.com");
    expect(result.text).not.toContain("alert");
    expect(result.text).not.toContain("color");
    expect(result.text).toContain("Clean content");
  });

  it("removes nav and footer", () => {
    const html = `
      <html>
        <body>
          <nav>Menu items</nav>
          <main><p>Main content</p></main>
          <footer>Copyright</footer>
        </body>
      </html>
    `;
    const result = parseHtml(html, "https://example.com");
    expect(result.text).not.toContain("Menu items");
    expect(result.text).not.toContain("Copyright");
    expect(result.text).toContain("Main content");
  });

  it("truncates long content", () => {
    const longText = "a".repeat(10000);
    const html = `<html><body><p>${longText}</p></body></html>`;
    const result = parseHtml(html, "https://example.com");
    expect(result.truncated).toBe(true);
    expect(result.text).toContain("[Content truncated]");
    expect(result.text.length).toBeLessThan(longText.length);
  });

  it("falls back to h1 for title when no title tag", () => {
    const html = `<html><body><h1>My Heading</h1><p>Content</p></body></html>`;
    const result = parseHtml(html, "https://example.com");
    expect(result.title).toBe("My Heading");
  });

  it("falls back to URL for title when no title or h1", () => {
    const html = `<html><body><p>Content</p></body></html>`;
    const result = parseHtml(html, "https://example.com");
    expect(result.title).toBe("https://example.com");
  });

  it("collapses whitespace", () => {
    const html = `<html><body><p>Hello     world</p><p>   </p><p>Next</p></body></html>`;
    const result = parseHtml(html, "https://example.com");
    expect(result.text).not.toMatch(/  /);
  });
});
