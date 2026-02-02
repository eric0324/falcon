"use client";

import { useState, useEffect } from "react";
import {
  MessageSquare,
  Plus,
  Trash2,
  PanelLeftClose,
  PanelLeft,
  Loader2,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "@/lib/format";

export interface ConversationItem {
  id: string;
  title: string | null;
  updatedAt: string;
  hasTool: boolean;
}

interface ConversationListProps {
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function ConversationList({
  currentId,
  onSelect,
  onNew,
  collapsed = false,
  onToggleCollapse,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // Refetch when currentId changes (new conversation created)
  useEffect(() => {
    if (currentId && !conversations.find((c) => c.id === currentId)) {
      fetchConversations();
    }
  }, [currentId, conversations]);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/conversations?limit=50");
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch {
      // Silently fail - list will be empty
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (deletingId) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        // If deleting current conversation, trigger new
        if (id === currentId) {
          onNew();
        }
      }
    } catch {
      // Silently fail
    } finally {
      setDeletingId(null);
    }
  };

  if (collapsed) {
    return (
      <div className="w-12 border-r bg-muted/30 flex flex-col items-center py-2 gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="h-8 w-8"
          title="展開側邊欄"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNew}
          className="h-8 w-8"
          title="新對話"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-60 border-r bg-muted/30 flex flex-col">
      {/* Header */}
      <div className="p-2 border-b flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onNew}
          className="flex-1 justify-start gap-2"
        >
          <Plus className="h-4 w-4" />
          新對話
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="h-8 w-8 shrink-0"
          title="收合側邊欄"
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8 px-4">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">還沒有對話紀錄</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={cn(
                  "group relative px-3 py-2 rounded-md cursor-pointer transition-colors",
                  "hover:bg-accent",
                  currentId === conv.id && "bg-accent"
                )}
              >
                <div className="flex items-start gap-2 pr-6">
                  <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {conv.title || "新對話"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conv.updatedAt))}
                      </span>
                      {conv.hasTool && (
                        <Wrench className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>
                {/* Delete button - show on hover */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleDelete(e, conv.id)}
                  disabled={deletingId === conv.id}
                  className={cn(
                    "absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6",
                    "opacity-0 group-hover:opacity-100 transition-opacity",
                    "hover:bg-destructive/10 hover:text-destructive"
                  )}
                  title="刪除對話"
                >
                  {deletingId === conv.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
