"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import {
  Wrench,
  Trash2,
  Loader2,
  PanelLeft,
  Plus,
  ChevronUp,
  Globe,
  BookOpen,
  Info,
  LogOut,
  Check,
  Pencil,
  MoreHorizontal,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/sidebar-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SettingsDialog } from "@/components/settings-dialog";
import { locales, Locale } from "@/i18n/config";

const languageNames: Record<Locale, string> = {
  en: "English",
  "zh-TW": "繁體中文",
};

function getLocaleFromCookie(): Locale {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/locale=([^;]+)/);
  return (match?.[1] as Locale) || "en";
}

function setLocaleCookie(locale: Locale) {
  document.cookie = `locale=${locale};path=/;max-age=31536000`;
}

interface ConversationItem {
  id: string;
  title: string | null;
  starred: boolean;
  updatedAt: string;
  hasTool: boolean;
}

interface UserInfo {
  name: string;
  email: string;
  image: string | null;
}

interface SidebarProps {
  conversations: ConversationItem[];
  user: UserInfo;
}

const navItems = [
  { href: "/chat", labelKey: "nav.chat" as const, icon: Plus, neverActive: true, exact: false },
  { href: "/tools", labelKey: "nav.tools" as const, icon: Wrench, neverActive: false, exact: false },
];

function SidebarContent({ conversations: initialConversations, user }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isOpen, isMobile, close, toggle } = useSidebar();
  const [conversations, setConversations] = useState(initialConversations);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"changelog" | "about">("changelog");
  const [currentLocale, setCurrentLocale] = useState<Locale>("en");
  const t = useTranslations("sidebar");

  useEffect(() => {
    setCurrentLocale(getLocaleFromCookie());
  }, []);

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

  const handleDeleteConfirm = async () => {
    const id = deleteConfirmId;
    if (!id || deletingId) return;

    setDeleteConfirmId(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (currentConvId === id) {
          router.push("/chat");
        }
      }
    } catch {
      // Silently fail
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditStart = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditingTitle(currentTitle);
  };

  const handleEditSave = async () => {
    if (!editingId || !editingTitle.trim()) {
      setEditingId(null);
      return;
    }
    const title = editingTitle.trim();
    setConversations((prev) =>
      prev.map((c) => (c.id === editingId ? { ...c, title } : c))
    );
    setEditingId(null);
    try {
      await fetch(`/api/conversations/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
    } catch {
      // Silently fail — optimistic update already applied
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleEditSave();
    } else if (e.key === "Escape") {
      setEditingId(null);
    }
  };

  const handleStarToggle = async (id: string, currentStarred: boolean) => {
    const newStarred = !currentStarred;
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, starred: newStarred } : c))
    );
    try {
      await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starred: newStarred }),
      });
    } catch {
      // Revert on failure
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, starred: currentStarred } : c))
      );
    }
  };

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    if (isMobile) close();
    if (href === "/chat" && pathname === "/chat") {
      e.preventDefault();
      // Always dispatch reset event, then navigate
      window.dispatchEvent(new Event("new-chat"));
      if (currentConvId) {
        router.push("/chat");
      }
    }
  };

  const openSettings = (tab: "changelog" | "about") => {
    setSettingsTab(tab);
    setSettingsOpen(true);
  };

  const handleLocaleChange = (locale: Locale) => {
    setCurrentLocale(locale);
    setLocaleCookie(locale);
    window.location.reload();
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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
        <Link
          href="/chat"
          className="mt-4"
          onClick={(e) => {
            if (pathname === "/chat") {
              e.preventDefault();
              window.dispatchEvent(new Event("new-chat"));
              if (searchParams.get("id")) router.push("/chat");
            }
          }}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.image || undefined} alt={user.name} />
                <AvatarFallback className="bg-neutral-200 text-neutral-700 text-xs">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-56">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Globe className="mr-2 h-4 w-4" />
                {t("userMenu.language")}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {locales.map((locale) => (
                  <DropdownMenuItem
                    key={locale}
                    onClick={() => handleLocaleChange(locale)}
                    className="flex items-center justify-between"
                  >
                    {languageNames[locale]}
                    {currentLocale === locale && <Check className="h-4 w-4" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onClick={() => openSettings("changelog")}>
              <BookOpen className="mr-2 h-4 w-4" />
              {t("userMenu.changelog")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openSettings("about")}>
              <Info className="mr-2 h-4 w-4" />
              {t("userMenu.about")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t("userMenu.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          defaultTab={settingsTab}
        />
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
          <Link href="/" className="font-semibold text-neutral-900 hover:text-neutral-700 transition-colors">Falcon</Link>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className="h-9 w-9 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
          >
            <PanelLeft className="h-5 w-5" />
          </Button>
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
              <div className="pb-4">
                {(() => {
                  const starredConvs = conversations.filter((c) => c.starred);
                  const unstarredConvs = conversations.filter((c) => !c.starred);

                  const renderConversation = (conv: ConversationItem) => {
                    const isActive = pathname === "/chat" && currentConvId === conv.id;

                    return (
                      <div
                        key={conv.id}
                        className={cn(
                          "group flex items-center rounded-lg text-sm transition-colors",
                          isActive
                            ? "bg-neutral-100 text-neutral-900"
                            : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                        )}
                      >
                        {editingId === conv.id ? (
                          <div className="flex-1 px-2 py-1.5">
                            <input
                              autoFocus
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={handleEditKeyDown}
                              onBlur={handleEditSave}
                              placeholder={t("conversation.editTitlePlaceholder")}
                              className="w-full px-1.5 py-1 text-sm bg-white border border-neutral-300 rounded outline-none focus:border-neutral-500"
                            />
                          </div>
                        ) : (
                          <Link
                            href={`/chat?id=${conv.id}`}
                            onClick={(e) => handleNavClick(e, `/chat?id=${conv.id}`)}
                            className="flex-1 flex items-center justify-between px-3 py-2.5"
                          >
                            <span className="flex items-center gap-1.5 min-w-0 truncate">
                              {conv.starred && (
                                <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />
                              )}
                              <span className="truncate">
                                {conv.title || t("conversation.newConversation")}
                              </span>
                            </span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <span
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  className={cn(
                                    "shrink-0 p-1 rounded text-neutral-400 hover:text-neutral-600 hover:bg-neutral-200 cursor-pointer",
                                    isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                  )}
                                >
                                  {deletingId === conv.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  )}
                                </span>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" side="bottom">
                                <DropdownMenuItem onClick={() => handleStarToggle(conv.id, conv.starred)}>
                                  <Star className={cn("h-3.5 w-3.5 mr-2", conv.starred && "fill-amber-400 text-amber-400")} />
                                  {conv.starred ? t("conversation.unstar") : t("conversation.star")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditStart(conv.id, conv.title || "")}>
                                  <Pencil className="h-3.5 w-3.5 mr-2" />
                                  {t("conversation.rename")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeleteConfirmId(conv.id)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                                  {t("conversation.delete")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </Link>
                        )}
                      </div>
                    );
                  };

                  return (
                    <>
                      {starredConvs.length > 0 && (
                        <div className="mb-2">
                          <p className="px-3 py-1.5 text-xs font-medium text-neutral-400">
                            {t("conversation.starred")}
                          </p>
                          <div className="space-y-0.5">
                            {starredConvs.map(renderConversation)}
                          </div>
                        </div>
                      )}
                      <div>
                        {starredConvs.length > 0 && unstarredConvs.length > 0 && (
                          <div className="px-3 py-1.5">
                            <div className="border-t border-neutral-200" />
                          </div>
                        )}
                        <div className="space-y-0.5">
                          {unstarredConvs.map(renderConversation)}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* User Menu */}
        <div className="p-3 border-t border-neutral-200">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-neutral-100 transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.image || undefined} alt={user.name} />
                  <AvatarFallback className="bg-neutral-200 text-neutral-700 text-xs">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 text-left text-sm font-medium text-neutral-900 truncate">
                  {user.name}
                </span>
                <ChevronUp className="h-4 w-4 text-neutral-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Globe className="mr-2 h-4 w-4" />
                  {t("userMenu.language")}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {locales.map((locale) => (
                    <DropdownMenuItem
                      key={locale}
                      onClick={() => handleLocaleChange(locale)}
                      className="flex items-center justify-between"
                    >
                      {languageNames[locale]}
                      {currentLocale === locale && <Check className="h-4 w-4" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem onClick={() => openSettings("changelog")}>
                <BookOpen className="mr-2 h-4 w-4" />
                {t("userMenu.changelog")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openSettings("about")}>
                <Info className="mr-2 h-4 w-4" />
                {t("userMenu.about")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t("userMenu.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          defaultTab={settingsTab}
        />
        <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{t("conversation.deleteTitle")}</DialogTitle>
              <DialogDescription>{t("conversation.deleteDescription")}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
                {t("conversation.deleteCancel")}
              </Button>
              <Button variant="destructive" onClick={handleDeleteConfirm}>
                {t("conversation.deleteConfirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
