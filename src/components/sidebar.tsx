"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import {
  Store,
  Wrench,
  MessageSquare,
  Trash2,
  Loader2,
  PanelLeftClose,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/sidebar-provider";
import { formatDistanceToNow } from "@/lib/format";

interface ConversationItem {
  id: string;
  title: string | null;
  updatedAt: string;
  hasTool: boolean;
}

interface SidebarProps {
  conversations: ConversationItem[];
}

const navItems = [
  { href: "/marketplace", label: "探索市集", icon: Store },
  { href: "/", label: "我的工具", icon: Wrench, exact: true },
];

function SidebarContent({ conversations: initialConversations }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isOpen, isMobile, close } = useSidebar();
  const [conversations, setConversations] = useState(initialConversations);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const currentConvId = searchParams.get("id");

  // Refetch conversations when a new one is created
  useEffect(() => {
    if (currentConvId && !conversations.find((c) => c.id === currentConvId)) {
      fetch("/api/conversations?limit=50")
        .then((res) => res.ok ? res.json() : [])
        .then(setConversations)
        .catch(() => {});
    }
  }, [currentConvId, conversations]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (deletingId) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
      }
    } catch {
      // Silently fail
    } finally {
      setDeletingId(null);
    }
  };

  const handleNavClick = () => {
    if (isMobile) {
      close();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Overlay for mobile */}
      {isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "w-64 border-r bg-background flex flex-col shrink-0 z-50",
          isMobile && "fixed inset-y-0 left-0 shadow-lg"
        )}
      >
        {/* Header with collapse button (mobile) */}
        {isMobile && (
          <div className="h-14 border-b flex items-center justify-between px-4">
            <span className="font-semibold">選單</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={close}
              className="h-8 w-8"
            >
              <PanelLeftClose className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href) && item.href !== "/";
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="px-3">
          <div className="border-t" />
        </div>

        {/* Conversation History */}
        <div className="flex-1 flex flex-col min-h-0 pt-3">
          <h3 className="px-4 text-xs font-medium text-muted-foreground mb-2">
            對話紀錄
          </h3>
          <ScrollArea className="flex-1">
            {conversations.length === 0 ? (
              <div className="text-center py-8 px-4">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">還沒有對話紀錄</p>
              </div>
            ) : (
              <div className="px-3 space-y-1 pb-4">
                {conversations.map((conv) => {
                  const isActive = pathname === "/studio" && currentConvId === conv.id;

                  return (
                    <Link
                      key={conv.id}
                      href={`/studio?id=${conv.id}`}
                      onClick={handleNavClick}
                      className={cn(
                        "group relative flex items-start gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0 pr-6">
                        <p className="truncate font-medium">
                          {conv.title || "新對話"}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs opacity-70">
                            {formatDistanceToNow(new Date(conv.updatedAt))}
                          </span>
                          {conv.hasTool && (
                            <Wrench className="h-3 w-3 opacity-70" />
                          )}
                        </div>
                      </div>

                      {/* Delete button */}
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
                      >
                        {deletingId === conv.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </aside>
    </>
  );
}

export function Sidebar(props: SidebarProps) {
  return (
    <Suspense fallback={null}>
      <SidebarContent {...props} />
    </Suspense>
  );
}
