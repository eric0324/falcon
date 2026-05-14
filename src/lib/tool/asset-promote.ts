import { copyImage } from "@/lib/storage/s3";

/**
 * Find every s3 image key in `code` that lives under the deploying author's
 * personal namespace and copy it to the tool's asset namespace, then rewrite
 * the code string to point at the new path.
 *
 * Why this exists: a tool's `Tool.code` runs in any user's sandbox. Without
 * promotion, runtime calls to `image.read` / `image.edit` against the author's
 * `images/<authorId>/...` keys are rejected by the bridge's ownership check.
 * By copying the key into `tools/<toolId>/...` and rewriting the reference, the
 * tool can read its own bundled assets regardless of who is running it.
 *
 * Idempotent: keys already under `tools/<toolId>/...` aren't matched, so calling
 * this on already-promoted code is a no-op.
 */

const EXT_TO_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export interface PromoteResult {
  rewrittenCode: string;
  promotedCount: number;
}

export async function promoteAuthorAssets(params: {
  code: string;
  authorId: string;
  toolId: string;
}): Promise<PromoteResult> {
  const { code, authorId, toolId } = params;

  // Match keys like "images/<authorId>/<uuid>.png" where <uuid> contains no slashes.
  // The author-id segment is anchored to the deploying user so we don't accidentally
  // copy someone else's image.
  const pattern = new RegExp(
    `images/${escapeRegExp(authorId)}/([A-Za-z0-9_\\-]+)\\.(png|jpe?g|webp)`,
    "g"
  );

  const uniqueMatches = new Map<string, { uuid: string; ext: string }>();
  for (const m of Array.from(code.matchAll(pattern))) {
    uniqueMatches.set(m[0], { uuid: m[1], ext: m[2].toLowerCase() });
  }

  if (uniqueMatches.size === 0) {
    return { rewrittenCode: code, promotedCount: 0 };
  }

  let rewrittenCode = code;
  for (const [fromKey, info] of Array.from(uniqueMatches.entries())) {
    const toKey = `tools/${toolId}/images/${info.uuid}.${info.ext}`;
    const contentType = EXT_TO_MIME[info.ext];
    await copyImage({ fromKey, toKey, ...(contentType ? { contentType } : {}) });
    // replaceAll on the literal string (no regex escaping pitfalls)
    rewrittenCode = rewrittenCode.split(fromKey).join(toKey);
  }

  return { rewrittenCode, promotedCount: uniqueMatches.size };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
