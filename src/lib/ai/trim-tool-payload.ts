/**
 * Strip the redundant `raw` field from a Sheets read result. The connector
 * returns `{ headers, rows, raw }` where `raw` is just the 2D array form of
 * headers + rows — the same data twice. LLMs use `.rows` (per the system
 * prompt), so dropping `raw` cuts ~half of the Sheets read payload.
 *
 * Non-matching shapes (file lists, metadata, null, etc.) pass through
 * unchanged. Input is never mutated.
 */
export function trimSheetsReadPayload(data: unknown): unknown {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data;
  if (!("raw" in data)) return data;
  const copy = { ...(data as Record<string, unknown>) };
  delete copy.raw;
  return copy;
}

const DEFAULT_GMAIL_BODY_MAX_CHARS = 5000;

/**
 * Truncate Gmail message `body` to `maxChars` (default 5000) and append a
 * marker showing the original length. Other fields (from, to, subject,
 * snippet, labels, etc.) are preserved unchanged. Non-matching shapes
 * (list results without `body`, non-string `body`, primitives) pass through
 * unchanged. Input is never mutated.
 */
export function trimGmailBody(
  data: unknown,
  options?: { maxChars?: number }
): unknown {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data;
  const obj = data as Record<string, unknown>;
  const body = obj.body;
  if (typeof body !== "string") return data;
  const maxChars = options?.maxChars ?? DEFAULT_GMAIL_BODY_MAX_CHARS;
  if (body.length <= maxChars) return data;

  const kept = body.slice(0, maxChars);
  const truncated = `${kept}\n\n[Body truncated: kept first ${maxChars} chars of ${body.length} total]`;
  return { ...obj, body: truncated };
}
