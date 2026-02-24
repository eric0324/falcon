export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: "calling" | "completed";
  result?: unknown;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  tokenUsage?: { model: string; inputTokens: number; outputTokens: number };
}
