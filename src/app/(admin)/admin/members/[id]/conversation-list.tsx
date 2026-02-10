"use client";

import { useState } from "react";
import { ChevronRight, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConversationSummary {
  id: string;
  title: string;
  messageCount: number;
  model: string | null;
  totalTokens: number;
  estimatedCost: number;
  updatedAt: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatCost(cost: number): string {
  if (cost === 0) return "$0";
  if (cost < 0.01) return "<$0.01";
  return `$${cost.toFixed(2)}`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("zh-TW", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ConversationList({
  conversations,
  userId,
}: {
  conversations: ConversationSummary[];
  userId: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [loading, setLoading] = useState<string | null>(null);

  async function toggleConversation(conversationId: string) {
    if (expandedId === conversationId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(conversationId);

    if (messages[conversationId]) return;

    setLoading(conversationId);
    try {
      const res = await fetch(
        `/api/admin/members/${userId}/conversations/${conversationId}`
      );
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => ({
          ...prev,
          [conversationId]: data.messages || [],
        }));
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="border rounded-lg divide-y">
      {conversations.map((conv) => (
        <div key={conv.id}>
          <button
            onClick={() => toggleConversation(conv.id)}
            className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
          >
            <ChevronRight
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform shrink-0",
                expandedId === conv.id && "rotate-90"
              )}
            />
            <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{conv.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {conv.messageCount} 則訊息
                {conv.model && ` / ${conv.model}`}
                {conv.totalTokens > 0
                  ? ` / ${formatTokens(conv.totalTokens)} tokens / ${formatCost(conv.estimatedCost)}`
                  : ` / 無用量紀錄`}
              </div>
            </div>
            <div className="text-xs text-muted-foreground shrink-0" suppressHydrationWarning>
              {formatDate(conv.updatedAt)}
            </div>
          </button>

          {expandedId === conv.id && (
            <div className="px-4 pb-4 pl-11">
              {loading === conv.id ? (
                <p className="text-sm text-muted-foreground py-4">載入中...</p>
              ) : messages[conv.id] ? (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {messages[conv.id].map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded-lg p-3 text-sm",
                        msg.role === "user"
                          ? "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
                          : "bg-muted"
                      )}
                    >
                      <div className="text-xs font-medium text-muted-foreground mb-1">
                        {msg.role === "user" ? "User" : "Assistant"}
                      </div>
                      <div className="whitespace-pre-wrap break-words">
                        {typeof msg.content === "string"
                          ? msg.content
                          : JSON.stringify(msg.content)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
