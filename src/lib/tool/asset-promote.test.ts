import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCopyImage = vi.fn();

vi.mock("@/lib/storage/s3", () => ({
  copyImage: (...args: unknown[]) => mockCopyImage(...args),
}));

import { promoteAuthorAssets } from "./asset-promote";

const AUTHOR = "user-A";
const TOOL = "tool-1";

beforeEach(() => {
  vi.clearAllMocks();
  mockCopyImage.mockResolvedValue(undefined);
});

describe("promoteAuthorAssets", () => {
  it("copies and rewrites a single author-owned key", async () => {
    const code = `const LOGO = "images/${AUTHOR}/abc.png";`;
    const result = await promoteAuthorAssets({
      code,
      authorId: AUTHOR,
      toolId: TOOL,
    });

    expect(mockCopyImage).toHaveBeenCalledWith({
      fromKey: `images/${AUTHOR}/abc.png`,
      toKey: `tools/${TOOL}/images/abc.png`,
      contentType: "image/png",
    });
    expect(result.rewrittenCode).toContain(`tools/${TOOL}/images/abc.png`);
    expect(result.rewrittenCode).not.toContain(`images/${AUTHOR}/abc.png`);
    expect(result.promotedCount).toBe(1);
  });

  it("handles multiple distinct keys and preserves jpeg/webp extensions", async () => {
    const code = `
      const A = "images/${AUTHOR}/a.png";
      const B = "images/${AUTHOR}/b.jpg";
      const C = "images/${AUTHOR}/c.webp";
    `;
    const result = await promoteAuthorAssets({
      code,
      authorId: AUTHOR,
      toolId: TOOL,
    });

    expect(mockCopyImage).toHaveBeenCalledTimes(3);
    expect(result.promotedCount).toBe(3);
    expect(result.rewrittenCode).toContain(`tools/${TOOL}/images/a.png`);
    expect(result.rewrittenCode).toContain(`tools/${TOOL}/images/b.jpg`);
    expect(result.rewrittenCode).toContain(`tools/${TOOL}/images/c.webp`);

    const contentTypes = mockCopyImage.mock.calls.map((c) => c[0].contentType);
    expect(contentTypes).toContain("image/png");
    expect(contentTypes).toContain("image/jpeg");
    expect(contentTypes).toContain("image/webp");
  });

  it("deduplicates a key referenced multiple times in the code", async () => {
    const code = `
      const A = "images/${AUTHOR}/x.png";
      function getOther() { return "images/${AUTHOR}/x.png"; }
    `;
    const result = await promoteAuthorAssets({
      code,
      authorId: AUTHOR,
      toolId: TOOL,
    });

    expect(mockCopyImage).toHaveBeenCalledTimes(1);
    expect(result.promotedCount).toBe(1);
    // Both occurrences rewritten
    const matches = result.rewrittenCode.match(
      new RegExp(`tools/${TOOL}/images/x\\.png`, "g")
    );
    expect(matches?.length).toBe(2);
  });

  it("does not touch keys belonging to other users", async () => {
    const code = `const X = "images/some-other-user/x.png";`;
    const result = await promoteAuthorAssets({
      code,
      authorId: AUTHOR,
      toolId: TOOL,
    });

    expect(mockCopyImage).not.toHaveBeenCalled();
    expect(result.rewrittenCode).toBe(code);
    expect(result.promotedCount).toBe(0);
  });

  it("is idempotent: already-promoted tools/ keys are untouched", async () => {
    const code = `const X = "tools/${TOOL}/images/x.png";`;
    const result = await promoteAuthorAssets({
      code,
      authorId: AUTHOR,
      toolId: TOOL,
    });

    expect(mockCopyImage).not.toHaveBeenCalled();
    expect(result.rewrittenCode).toBe(code);
    expect(result.promotedCount).toBe(0);
  });

  it("returns code unchanged when there are no images at all", async () => {
    const code = `export default function App() { return <div>hi</div>; }`;
    const result = await promoteAuthorAssets({
      code,
      authorId: AUTHOR,
      toolId: TOOL,
    });

    expect(mockCopyImage).not.toHaveBeenCalled();
    expect(result.rewrittenCode).toBe(code);
    expect(result.promotedCount).toBe(0);
  });

  it("only promotes keys exactly matching the deploying author", async () => {
    // A second author's key in the same code (shouldn't happen in practice but
    // we still must not promote it for AUTHOR's deploy)
    const code = `
      const MINE = "images/${AUTHOR}/a.png";
      const THEIRS = "images/other-user/b.png";
    `;
    const result = await promoteAuthorAssets({
      code,
      authorId: AUTHOR,
      toolId: TOOL,
    });

    expect(mockCopyImage).toHaveBeenCalledTimes(1);
    expect(mockCopyImage.mock.calls[0][0].fromKey).toBe(`images/${AUTHOR}/a.png`);
    expect(result.promotedCount).toBe(1);
    expect(result.rewrittenCode).toContain(`tools/${TOOL}/images/a.png`);
    expect(result.rewrittenCode).toContain(`images/other-user/b.png`); // untouched
  });
});
