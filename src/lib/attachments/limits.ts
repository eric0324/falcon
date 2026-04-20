/** Soft limit: above this we warn the user and offer truncation. ≈ 30KB English text. */
export const WARN_TOKENS = 8_000;

/** Hard limit: above this we reject the upload outright. ≈ 128KB English text. */
export const HARD_TOKENS = 32_000;

export type AttachmentSizeClass = "ok" | "warn" | "reject";

/** Classify a token estimate against the configured limits. */
export function classifyAttachmentSize(tokens: number): AttachmentSizeClass {
  if (tokens >= HARD_TOKENS) return "reject";
  if (tokens >= WARN_TOKENS) return "warn";
  return "ok";
}
