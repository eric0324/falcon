"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import {
  Store,
  Wrench,
  Trash2,
  Loader2,
  PanelLeft,
  Plus,
  ChevronUp,
  Globe,
  BookOpen,
  HelpCircle,
  LogOut,
  Check,
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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/sidebar-provider";
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
  { href: "/chat", labelKey: "nav.chat" as const, icon: Plus, neverActive: true },
  { href: "/", labelKey: "nav.tools" as const, icon: Wrench, exact: true },
  { href: "/marketplace", labelKey: "nav.explore" as const, icon: Store },
];

function SidebarContent({ conversations: initialConversations, user }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isOpen, isMobile, close, toggle } = useSidebar();
  const [conversations, setConversations] = useState(initialConversations);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
            <DropdownMenuItem asChild>
              <a href="https://github.com/eric0324/falcon/issues" target="_blank" rel="noopener noreferrer">
                <HelpCircle className="mr-2 h-4 w-4" />
                {t("userMenu.support")}
              </a>
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
          <span className="font-semibold text-neutral-900">Falcon</span>
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
              <div className="space-y-0.5 pb-4">
                {conversations.map((conv) => {
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
                      <Link
                        href={`/chat?id=${conv.id}`}
                        onClick={(e) => handleNavClick(e, `/chat?id=${conv.id}`)}
                        className="flex-1 flex items-center justify-between px-3 py-2.5"
                      >
                        <span>
                          {(conv.title || t("conversation.newConversation")).slice(0, 12)}
                          {(conv.title || "").length > 12 && "..."}
                        </span>
                        <span
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDelete(e, conv.id);
                          }}
                          className={cn(
                            "shrink-0 p-1 rounded",
                            "text-neutral-400 hover:text-red-500 hover:bg-neutral-200",
                            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                          )}
                        >
                          {deletingId === conv.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </span>
                      </Link>
                    </div>
                  );
                })}
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
              <DropdownMenuItem asChild>
                <a href="https://github.com/eric0324/falcon/issues" target="_blank" rel="noopener noreferrer">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  {t("userMenu.support")}
                </a>
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
