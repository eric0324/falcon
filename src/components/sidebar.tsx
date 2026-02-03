"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { useTranslations } from "next-intl";
import {
  Store,
  Wrench,
  Trash2,
  Loader2,
  PanelLeft,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/sidebar-provider";
import { SettingsDialog } from "@/components/settings-dialog";

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
  { href: "/chat", labelKey: "nav.chat" as const, icon: Plus, neverActive: true },
  { href: "/", labelKey: "nav.tools" as const, icon: Wrench, exact: true },
  { href: "/marketplace", labelKey: "nav.explore" as const, icon: Store },
];

function SidebarContent({ conversations: initialConversations }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isOpen, isMobile, close, toggle } = useSidebar();
  const [conversations, setConversations] = useState(initialConversations);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const t = useTranslations("sidebar");

  const currentConvId = searchParams.get("id");
  const [hasFetched, setHasFetched] = useState(false);

  // Refresh conversations when a new conversation is selected that's not in the list
  useEffect(() => {
    if (currentConvId && !hasFetched && !initialConversations.find((c) => c.id === currentConvId)) {
      setHasFetched(true);
      fetch("/api/conversations?limit=50")
        .then((res) => res.ok ? res.json() : [])
        .then(setConversations)
        .catch(() => {});
    }
  }, [currentConvId, hasFetched, initialConversations]);

  // Reset fetch flag when conversation changes
  useEffect(() => {
    setHasFetched(false);
  }, [currentConvId]);

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

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    if (isMobile) close();
    // Force navigation to /chat when clicking +Chat while already on /chat with an id
    if (href === "/chat" && pathname === "/chat" && currentConvId) {
      e.preventDefault();
      router.push("/chat");
    }
  };

  // Collapsed state
  if (!isOpen) {
    return (
      <div className="w-16 bg-white border-r border-neutral-200 flex flex-col items-center py-4 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="h-10 w-10 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
        >
          <PanelLeft className="h-5 w-5" />
        </Button>
        <Link href="/chat" className="mt-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1" />
        <SettingsDialog collapsed />
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
          "w-64 bg-white border-r border-neutral-200 text-neutral-900 flex flex-col shrink-0 z-50",
          isMobile && "fixed inset-y-0 left-0"
        )}
      >
        {/* Header */}
        <div className="p-3 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className="h-9 w-9 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
          >
            <PanelLeft className="h-5 w-5" />
          </Button>
          <span className="font-semibold text-neutral-900">Falcon</span>
          <div className="flex-1" />
          <SettingsDialog />
        </div>

        {/* Navigation */}
        <nav className="px-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = item.neverActive
              ? false
              : item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href) && item.href !== "/";
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-neutral-100 text-neutral-900"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                )}
              >
                <Icon className="h-4 w-4" />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="px-3 py-3">
          <div className="border-t border-neutral-200" />
        </div>

        {/* Conversations */}
        <div className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 px-3">
            {conversations.length === 0 ? (
              <p className="text-neutral-500 text-sm px-3 py-4">
                {t("conversation.empty")}
              </p>
            ) : (
              <div className="space-y-0.5 pb-4">
                {conversations.map((conv) => {
                  const isActive = pathname === "/chat" && currentConvId === conv.id;

                  return (
                    <Link
                      key={conv.id}
                      href={`/chat?id=${conv.id}`}
                      onClick={(e) => handleNavClick(e, `/chat?id=${conv.id}`)}
                      className={cn(
                        "group relative flex items-center px-3 py-2.5 rounded-lg text-sm transition-colors",
                        isActive
                          ? "bg-neutral-100 text-neutral-900"
                          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                      )}
                    >
                      <span className="truncate pr-6">
                        {conv.title || t("conversation.newConversation")}
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
