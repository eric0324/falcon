import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

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
  // Only show "generating code" when there's an incomplete code block (odd number of ```)
  const hasIncompleteCodeBlock = codeBlockCount % 2 === 1;
  const isGeneratingCode = !isUser && isStreaming && hasIncompleteCodeBlock;

  // User message - with bubble on right, no avatar
  if (isUser) {
    return (
      <div className="flex justify-end pr-8">
        <div className="rounded-2xl px-4 py-2 max-w-[85%] text-sm bg-primary text-primary-foreground">
          <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-invert">
            <ReactMarkdown>{displayContent}</ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  // Assistant message - no bubble, no avatar, just text
  return (
    <div className="text-sm">
      <div className={cn(
        "prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0",
        "dark:prose-invert"
      )}>
        <ReactMarkdown>{displayContent}</ReactMarkdown>
      </div>
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
  );
}
