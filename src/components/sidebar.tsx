"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import {
  Store,
  Wrench,
  Trash2,
  Loader2,
  PanelLeft,
  Plus,
  Github,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/sidebar-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ConversationItem {
  id: string;
  title: string | null;
  updatedAt: string;
  hasTool: boolean;
}

interface SidebarProps {
  conversations: ConversationItem[];
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const navItems = [
  { href: "/studio", label: "對話", icon: Plus },
  { href: "/", label: "工具", icon: Wrench, exact: true },
  { href: "/marketplace", label: "探索", icon: Store },
];

function SidebarContent({ conversations: initialConversations, user }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isOpen, isMobile, close, toggle } = useSidebar();
  const [conversations, setConversations] = useState(initialConversations);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const currentConvId = searchParams.get("id");

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
    if (isMobile) close();
  };

  // Collapsed state
  if (!isOpen) {
    return (
      <div className="w-16 bg-neutral-900 flex flex-col items-center py-4 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="h-10 w-10 text-neutral-400 hover:text-white hover:bg-neutral-800"
        >
          <PanelLeft className="h-5 w-5" />
        </Button>
        <Link href="/studio" className="mt-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-neutral-400 hover:text-white hover:bg-neutral-800"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1" />
        <a
          href="https://github.com/eric0324"
          target="_blank"
          rel="noopener noreferrer"
          className="text-neutral-500 hover:text-white transition-colors mb-3"
          aria-label="GitHub"
        >
          <Github className="h-4 w-4" />
        </a>
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.image || undefined} />
          <AvatarFallback className="bg-neutral-700 text-white text-xs">
            {user.name?.[0] || user.email?.[0] || "U"}
          </AvatarFallback>
        </Avatar>
      </div>
    );
  }

  return (
    <>
      {isMobile && (
        <div
          className="fixed inset-0 bg-black/60 z-40"
          onClick={close}
        />
      )}

      <aside
        className={cn(
          "w-64 bg-neutral-900 text-white flex flex-col shrink-0 z-50",
          isMobile && "fixed inset-y-0 left-0"
        )}
      >
        {/* Header */}
        <div className="p-3 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className="h-9 w-9 text-neutral-400 hover:text-white hover:bg-neutral-800"
          >
            <PanelLeft className="h-5 w-5" />
          </Button>
          <span className="font-semibold text-white">Falcon</span>
        </div>

        {/* Navigation */}
        <nav className="px-3 space-y-0.5">
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
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="px-3 py-3">
          <div className="border-t border-neutral-800" />
        </div>

        {/* Conversations */}
        <div className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 px-3">
            {conversations.length === 0 ? (
              <p className="text-neutral-500 text-sm px-3 py-4">
                開始你的第一個對話
              </p>
            ) : (
              <div className="space-y-0.5 pb-4">
                {conversations.map((conv) => {
                  const isActive = pathname === "/studio" && currentConvId === conv.id;

                  return (
                    <Link
                      key={conv.id}
                      href={`/studio?id=${conv.id}`}
                      onClick={handleNavClick}
                      className={cn(
                        "group relative flex items-center px-3 py-2.5 rounded-lg text-sm transition-colors",
                        isActive
                          ? "bg-neutral-800 text-white"
                          : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                      )}
                    >
                      <span className="truncate pr-6">
                        {conv.title || "新對話"}
                      </span>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDelete(e, conv.id)}
                        disabled={deletingId === conv.id}
                        className={cn(
                          "absolute right-1 h-6 w-6",
                          "opacity-0 group-hover:opacity-100 transition-opacity",
                          "text-neutral-500 hover:text-red-400 hover:bg-transparent"
                        )}
                      >
                        {deletingId === conv.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="p-3 mt-auto space-y-3">
          {/* Version & GitHub */}
          <div className="flex items-center justify-center gap-2 text-xs text-white">
            <a
              href="https://github.com/eric0324"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-neutral-300 transition-colors flex items-center gap-1.5"
              aria-label="GitHub"
            >
              <Github className="h-3.5 w-3.5" />
              <span>v0.1.0</span>
            </a>
          </div>
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
