import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User, Check, Loader2 } from "lucide-react";

interface ChatMessageProps {
  message: {
    role: "user" | "assistant";
    content: string;
  };
  isStreaming?: boolean;
}

// Remove code blocks from message for display
function formatMessageContent(content: string, isAssistant: boolean): string {
  if (!isAssistant) return content;

  // Check if there's a complete code block (has both opening and closing ```)
  const codeBlockCount = (content.match(/```/g) || []).length;
  const hasCompleteCodeBlock = codeBlockCount >= 2;

  if (!hasCompleteCodeBlock) {
    // If code block is incomplete (still streaming), hide everything after ```
    const codeStart = content.indexOf("```");
    if (codeStart !== -1) {
      const beforeCode = content.substring(0, codeStart).trim();
      return beforeCode || "正在生成程式碼...";
    }
    return content;
  }

  // Remove complete code blocks
  let formatted = content.replace(/```[\s\S]*?```/g, "").trim();

  // If message is empty after removing code, show a friendly message
  if (!formatted) {
    formatted = "✨ 程式碼已生成，請查看右側預覽";
  }

  return formatted;
}

export function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === "user";
  const displayContent = formatMessageContent(message.content, !isUser);

  // Check code block status
  const codeBlockCount = (message.content.match(/```/g) || []).length;
  const hasCompleteCode = !isUser && codeBlockCount >= 2;
  // Show loading when streaming and has incomplete code block OR streaming without complete code
  const isGeneratingCode = !isUser && isStreaming && !hasCompleteCode;

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser && "flex-row-reverse"
      )}
    >
      <Avatar className={cn("h-8 w-8 shrink-0", isUser && "bg-primary")}>
        <AvatarFallback className={isUser ? "bg-primary text-primary-foreground" : "bg-secondary"}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
      <div
        className={cn(
          "rounded-lg px-3 py-2 max-w-[85%] text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        <span className="whitespace-pre-wrap">{displayContent}</span>
        {isGeneratingCode && (
          <span className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            正在生成程式碼...
          </span>
        )}
        {hasCompleteCode && (
          <span className="flex items-center gap-1 mt-1 text-xs text-green-600">
            <Check className="h-3 w-3" />
            已更新預覽
          </span>
        )}
      </div>
    </div>
  );
}
