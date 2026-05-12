export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: "calling" | "completed";
  result?: unknown;
}

export interface MessageAttachment {
  name: string;
  type: string;
  size: number;
  /** Set only when the file was uploaded to S3 (currently png / jpeg / webp). */
  s3Key?: string;
  /** Populated by the server after reading; TTL-limited signed URL for rendering. */
  presignedUrl?: string;
  /** Client-side only — data URL or base64 available before the message is persisted. */
  base64?: string;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  attachments?: MessageAttachment[];
  tokenUsage?: { model: string; inputTokens: number; outputTokens: number };
}
