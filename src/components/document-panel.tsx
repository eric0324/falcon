"use client";

import { useState, useEffect } from "react";
import { Download, Maximize2, Minimize2, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface DocumentPanelProps {
  markdown: string;
  title: string;
  onCollapsedChange?: (collapsed: boolean) => void;
}

function handleDownload(markdown: string, title: string) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[/\\?%*:|"<>]/g, "-")}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function DocumentPanel({ markdown, title, onCollapsedChange }: DocumentPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    onCollapsedChange?.(isFullscreen || isCollapsed);
  }, [isFullscreen, isCollapsed, onCollapsedChange]);

  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  const markdownContent = (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  );

  // Collapsed
  if (isCollapsed) {
    return (
      <div className="h-full flex items-center border-l">
        <button
          onClick={() => setIsCollapsed(false)}
          className="h-full px-1.5 hover:bg-muted/50 transition-colors flex items-center"
          title="展開文件"
        >
          <PanelRightOpen className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    );
  }

  // Fullscreen
  if (isFullscreen) {
    return (
      <>
        <div className="h-full flex items-center border-l">
          <button
            onClick={() => setIsFullscreen(false)}
            className="h-full px-1.5 hover:bg-muted/50 transition-colors flex items-center"
            title="退出全螢幕"
          >
            <Minimize2 className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="fixed inset-0 z-[100] bg-white dark:bg-neutral-950 flex flex-col">
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-3 right-3 z-10 p-2 rounded-lg bg-white/80 hover:bg-white text-black shadow-md backdrop-blur-sm transition-colors"
            title="退出全螢幕"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
          <div className="flex-1 overflow-y-auto p-8 sm:p-12">
            <div className="max-w-3xl mx-auto">
              {markdownContent}
            </div>
          </div>
        </div>
      </>
    );
  }

  // Normal
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="border-b px-4 py-2 shrink-0 flex items-center justify-between">
        <span className="text-sm font-medium truncate">{title}</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(markdown, title)} title="下載 Markdown">
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsFullscreen(true)} title="全螢幕">
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsCollapsed(true)} title="收合">
            <PanelRightClose className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {markdownContent}
      </div>
    </div>
  );
}
