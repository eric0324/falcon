import { User, Bot, Wrench, Paperclip } from "lucide-react";

interface Message {
  id: string;
  role: string;
  content: string;
  toolCalls: unknown;
  attachments: unknown;
  createdAt: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("zh-TW", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function roleLabel(role: string): string {
  if (role === "user") return "使用者";
  if (role === "assistant") return "AI";
  if (role === "tool") return "工具回傳";
  return role;
}

function roleIcon(role: string) {
  if (role === "user") return <User className="h-3.5 w-3.5" />;
  if (role === "tool") return <Wrench className="h-3.5 w-3.5" />;
  return <Bot className="h-3.5 w-3.5" />;
}

function summarizeAttachments(attachments: unknown): string[] {
  if (!Array.isArray(attachments)) return [];
  return attachments
    .filter((a): a is Record<string, unknown> => !!a && typeof a === "object")
    .map((a) => String(a.name ?? "unnamed"));
}

interface ToolCallItem {
  id?: string;
  name?: string;
  args?: unknown;
  result?: unknown;
}

function parseToolCalls(raw: unknown): ToolCallItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t): t is Record<string, unknown> => !!t && typeof t === "object")
    .map((t) => ({
      id: typeof t.id === "string" ? t.id : undefined,
      name: typeof t.name === "string" ? t.name : undefined,
      args: t.args,
      result: t.result,
    }));
}

function truncate(s: string, max = 400): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + "…";
}

export function MessageList({ messages }: { messages: Message[] }) {
  if (messages.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        此對話沒有任何訊息
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((msg) => {
        const toolCalls = parseToolCalls(msg.toolCalls);
        const attachmentNames = summarizeAttachments(msg.attachments);
        return (
          <div
            key={msg.id}
            className="border rounded-lg p-3 bg-white"
          >
            <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-foreground font-medium">
                {roleIcon(msg.role)}
                {roleLabel(msg.role)}
              </span>
              <span>{formatDate(msg.createdAt)}</span>
            </div>

            {msg.content && (
              <pre className="whitespace-pre-wrap break-words text-sm font-sans text-foreground">
                {msg.content}
              </pre>
            )}

            {attachmentNames.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {attachmentNames.map((name, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-muted"
                  >
                    <Paperclip className="h-3 w-3" />
                    {name}
                  </span>
                ))}
              </div>
            )}

            {toolCalls.length > 0 && (
              <div className="mt-3 space-y-2">
                {toolCalls.map((tc, i) => (
                  <div
                    key={tc.id || i}
                    className="border-l-2 border-primary/40 pl-3 py-1 text-xs"
                  >
                    <div className="flex items-center gap-1.5 font-medium text-primary">
                      <Wrench className="h-3 w-3" />
                      {tc.name || "tool"}
                    </div>
                    {tc.args !== undefined && (
                      <div className="mt-1 text-muted-foreground">
                        <div>params:</div>
                        <pre className="whitespace-pre-wrap break-words font-mono text-[11px]">
                          {truncate(
                            typeof tc.args === "string"
                              ? tc.args
                              : JSON.stringify(tc.args, null, 2)
                          )}
                        </pre>
                      </div>
                    )}
                    {tc.result !== undefined && (
                      <div className="mt-1 text-muted-foreground">
                        <div>result:</div>
                        <pre className="whitespace-pre-wrap break-words font-mono text-[11px]">
                          {truncate(
                            typeof tc.result === "string"
                              ? tc.result
                              : JSON.stringify(tc.result, null, 2)
                          )}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
