"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import { Settings, User, BookOpen, Info, LogOut, Github, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { locales, Locale } from "@/i18n/config";

type SettingsTab = "profile" | "changelog" | "about";

interface SettingsDialogProps {
  collapsed?: boolean;
}

const tabs: { id: SettingsTab; labelKey: string; icon: typeof User }[] = [
  { id: "profile", labelKey: "profile", icon: User },
  { id: "changelog", labelKey: "changelog", icon: BookOpen },
  { id: "about", labelKey: "about", icon: Info },
];

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

export function SettingsDialog({ collapsed }: SettingsDialogProps) {
  const t = useTranslations("sidebar.settings");
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [currentLocale, setCurrentLocale] = useState<Locale>("en");

  useEffect(() => {
    setCurrentLocale(getLocaleFromCookie());
  }, []);

  const handleLocaleChange = (locale: string) => {
    setCurrentLocale(locale as Locale);
    setLocaleCookie(locale as Locale);
    window.location.reload();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={
            collapsed
              ? "h-10 w-10 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              : "h-8 w-8 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
          }
        >
          <Settings className={collapsed ? "h-5 w-5" : "h-4 w-4"} />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <div className="flex h-[400px]">
          {/* Left sidebar */}
          <div className="w-48 border-r bg-neutral-50 p-2 flex flex-col">
            <DialogHeader className="p-3 pb-4">
              <DialogTitle className="text-base">{t("title")}</DialogTitle>
            </DialogHeader>
            <nav className="flex-1 space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left",
                      activeTab === tab.id
                        ? "bg-white text-neutral-900 shadow-sm"
                        : "text-neutral-600 hover:bg-white/50"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {t(tab.labelKey)}
                  </button>
                );
              })}
            </nav>
            <Button
              variant="ghost"
              className="justify-start text-red-600 hover:text-red-600 hover:bg-red-50"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t("logout")}
            </Button>
          </div>

          {/* Right content */}
          <div className="flex-1 p-6 overflow-auto">
            {activeTab === "profile" && (
              <div className="space-y-6">
                <h3 className="font-medium">{t("profile")}</h3>
                <div className="space-y-2">
                  <Label htmlFor="language">{t("language")}</Label>
                  <Select value={currentLocale} onValueChange={handleLocaleChange}>
                    <SelectTrigger id="language" className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {locales.map((locale) => (
                        <SelectItem key={locale} value={locale}>
                          {languageNames[locale]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {activeTab === "changelog" && (
              <div className="space-y-4">
                <h3 className="font-medium">{t("changelog")}</h3>
                <div className="space-y-4">
                  <div className="border-l-2 border-primary pl-4">
                    <p className="font-medium text-sm">v0.1.0</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("changelogV010")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "about" && (
              <div className="space-y-6">
                <h3 className="font-medium">{t("about")}</h3>

                {/* App Info */}
                <div className="text-center py-4">
                  <p className="text-2xl font-bold">Falcon</p>
                  <p className="text-sm text-muted-foreground mt-1">v0.1.0</p>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground text-center">
                  {t("aboutDescription")}
                </p>

                {/* Credits & Links */}
                <div className="pt-4 border-t space-y-3">
                  <p className="text-sm text-center">
                    Made with <span className="text-red-500">♥</span> by Eric
                  </p>
                  <div className="flex items-center justify-center gap-4">
                    <a
                      href="https://github.com/eric0324"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Github className="h-4 w-4" />
                      GitHub
                    </a>
                    <a
                      href="https://ericwu.asia"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Globe className="h-4 w-4" />
                      Website
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
