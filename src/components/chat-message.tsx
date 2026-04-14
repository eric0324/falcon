"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Check, Copy, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ToolCallInfo {
  name: string;
  status: "calling" | "completed";
}

interface ChatMessageProps {
  message: {
    role: "user" | "assistant";
    content: string;
  };
  isStreaming?: boolean;
  toolCalls?: ToolCallInfo[];
}

// Strip YAML front matter that can swallow content
function stripFrontMatter(text: string): string {
  return text.replace(/^---\n[\s\S]*?\n---\n?/, "");
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

  return stripFrontMatter(formatted);
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-neutral-200 text-neutral-400 hover:text-neutral-600 transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export function ChatMessage({ message, isStreaming = false, toolCalls = [] }: ChatMessageProps) {
  const isUser = message.role === "user";
  const displayContent = formatMessageContent(message.content, !isUser);

  // Check code block status (markdown)
  const codeBlockCount = (message.content.match(/```/g) || []).length;
  const hasCompleteCodeBlock = !isUser && codeBlockCount >= 2;
  const hasIncompleteCodeBlock = codeBlockCount % 2 === 1;
  const isGeneratingCodeBlock = !isUser && isStreaming && hasIncompleteCodeBlock;

  // Check updateCode tool call status
  const updateCodeCall = toolCalls.find((tc) => tc.name === "updateCode");
  const isToolGenerating = updateCodeCall?.status === "calling";
  const isToolCompleted = updateCodeCall?.status === "completed";

  // Combined: either markdown code block or updateCode tool call
  const isGeneratingCode = isGeneratingCodeBlock || (!isUser && isStreaming && isToolGenerating);
  const hasCompleteCode = hasCompleteCodeBlock || (!isUser && isToolCompleted);

  // User message - with bubble on right, no avatar
  if (isUser) {
    return (
      <div className="flex justify-end pr-8 group">
        <div className="flex items-start gap-1">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity pt-2">
            <CopyButton text={message.content} />
          </div>
          <div className="rounded-2xl px-4 py-2 max-w-[85%] text-sm bg-primary text-primary-foreground">
            <div className="whitespace-pre-wrap break-words">{displayContent}</div>
          </div>
        </div>
      </div>
    );
  }

  // Assistant message - no bubble, no avatar, just text
  return (
    <div className="text-sm group">
      <div className={cn(
        "prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0",
        "dark:prose-invert"
      )}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent}</ReactMarkdown>
      </div>
      {!isStreaming && displayContent && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1">
          <CopyButton text={message.content} />
        </div>
      )}
      {isGeneratingCode && (
        <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 text-xs font-medium">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          正在生成程式碼...
        </div>
      )}
      {hasCompleteCode && !isStreaming && (
        <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 text-xs font-medium">
          <Check className="h-3.5 w-3.5" />
          已更新預覽
        </div>
      )}
    </div>
  );
}
