"use client";

import { useTranslations } from "next-intl";
import { Github, Globe } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type SettingsTab = "changelog" | "about";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: SettingsTab;
}

export function SettingsDialog({ open, onOpenChange, defaultTab = "changelog" }: SettingsDialogProps) {
  const t = useTranslations("sidebar.settings");

  const getTitle = () => {
    switch (defaultTab) {
      case "changelog":
        return t("changelog");
      case "about":
        return t("about");
      default:
        return t("title");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(defaultTab === "changelog" ? "max-w-2xl" : "max-w-md")}>
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        {defaultTab === "changelog" && (
          <div className="space-y-4 pt-2 max-h-[60vh] overflow-y-auto">
            <div className="border-l-2 border-primary pl-4">
              <p className="font-medium text-sm">v0.1.0</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("changelogV010")}
              </p>
            </div>
          </div>
        )}

        {defaultTab === "about" && (
          <div className="space-y-4 pt-2">
            <div className="text-center py-2">
              <p className="text-2xl font-bold">Falcon</p>
              <p className="text-sm text-muted-foreground mt-1">v0.1.0</p>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              {t("aboutDescription")}
            </p>

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
      </DialogContent>
    </Dialog>
  );
}
