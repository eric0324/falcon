"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Share2, Maximize2, Minimize2, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateSandboxApiClient } from "@/lib/sandbox-api-client";

interface PreviewPanelProps {
  code: string;
  toolId?: string | null;
  dataSources?: string[];
  onError?: (error: string | null) => void;
  onShare?: () => void;
  onCollapsedChange?: (collapsed: boolean) => void;
}

const DEFAULT_CODE = `export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center text-gray-500">
        <p className="text-lg font-medium">Preview will appear here</p>
        <p className="text-sm mt-1">Start typing to generate your tool</p>
      </div>
    </div>
  );
}`;

function detectComponentName(code: string): string {
  const m = code.match(/export\s+default\s+function\s+([A-Z]\w*)/) ||
    code.match(/export\s+default\s+([A-Z]\w*)\s*;?\s*$/) ||
    Array.from(code.matchAll(/^(?:function|const)\s+([A-Z]\w*)/gm)).pop();
  return m?.[1] || "App";
}

function buildPreviewHtml(code: string, apiClientCode?: string): string {
  const componentName = detectComponentName(code);
  let cleanCode = code
    .replace(/^import\s+.*?from\s+['"][^'"]+['"];?\s*\n?/gm, "")
    .replace(/export\s+default\s+/, "");
  if (componentName !== "App") cleanCode += `\nconst App = ${componentName};`;

  const apiScript = apiClientCode ? `<script>${apiClientCode}</script>` : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>

  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>html, body, #root { margin: 0; padding: 0; min-height: 100%; }</style>
</head>
<body>
  <div id="root"></div>
  ${apiScript}
  <script type="text/babel">
    const { useState, useEffect, useCallback, useMemo, useRef, useReducer, useContext, createContext, Fragment } = React;

    ${cleanCode}

    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
    window.parent.postMessage({ type: 'preview-success' }, '*');
  </script>
  <script>
    window.onerror = (msg) => {
      window.parent.postMessage({ type: 'preview-error', message: String(msg) }, '*');
    };
  </script>
</body>
</html>`;
}

export function PreviewPanel({ code, toolId, dataSources, onError, onShare, onCollapsedChange }: PreviewPanelProps) {
  const [key, setKey] = useState(0);
  const [, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const displayCode = code || DEFAULT_CODE;

  const hasDataSources = dataSources && dataSources.length > 0;
  const apiClientCode = generateSandboxApiClient();

  const handleMessage = useCallback(
    async (event: MessageEvent) => {
      if (event.data?.type === "preview-error") {
        setError(event.data.message);
        onError?.(event.data.message);
        return;
      }
      if (event.data?.type === "preview-success") {
        setError(null);
        onError?.(null);
        return;
      }

      if (event.data?.type !== "api-bridge") return;
      const isPlatform = event.data.dataSourceId === "llm" || event.data.dataSourceId === "tooldb";
      if (!isPlatform && !hasDataSources) return;

      const { id, dataSourceId, action, params } = event.data;

      try {
        console.log("[PreviewPanel Bridge] fetching /api/bridge:", { dataSources, dataSourceId, action, params });
        const response = await fetch("/api/bridge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(toolId ? { toolId } : { dataSources }),
            dataSourceId,
            action,
            params,
          }),
        });

        const result = await response.json();
        console.log("[PreviewPanel Bridge] response:", response.status, result);

        const iframe = document.querySelector<HTMLIFrameElement>('iframe[title="Preview"]');
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage(
            {
              type: "api-bridge-response",
              id,
              result: response.ok ? result.data : undefined,
              error: response.ok ? undefined : result.error,
            },
            "*"
          );
        }
      } catch (err) {
        console.error("[PreviewPanel Bridge] error:", err);
        const iframe = document.querySelector<HTMLIFrameElement>('iframe[title="Preview"]');
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage(
            {
              type: "api-bridge-response",
              id,
              error: err instanceof Error ? err.message : "Unknown error",
            },
            "*"
          );
        }
      }
    },
    [onError, hasDataSources, toolId, dataSources]
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  useEffect(() => {
    setKey((prev) => prev + 1);
    setError(null);
  }, [code]);

  // Notify parent when fullscreen changes (treat as collapsed for layout)
  useEffect(() => {
    onCollapsedChange?.(isFullscreen || isCollapsed);
  }, [isFullscreen, isCollapsed, onCollapsedChange]);

  // ESC to exit fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  const handleRefresh = () => {
    setKey((prev) => prev + 1);
    setError(null);
  };

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  // Collapsed state — show a thin bar to expand
  if (isCollapsed) {
    return (
      <div className="h-full flex items-center border-l">
        <button
          onClick={handleToggleCollapse}
          className="h-full px-1.5 hover:bg-muted/50 transition-colors flex items-center"
          title="展開預覽"
        >
          <PanelRightOpen className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    );
  }

  // Fullscreen: show overlay + collapse the inline panel
  if (isFullscreen) {
    return (
      <>
        {/* Inline: thin bar like collapsed */}
        <div className="h-full flex items-center border-l">
          <button
            onClick={() => setIsFullscreen(false)}
            className="h-full px-1.5 hover:bg-muted/50 transition-colors flex items-center"
            title="退出全螢幕"
          >
            <Minimize2 className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        {/* Fullscreen overlay */}
        <div className="fixed inset-0 z-[100] bg-white dark:bg-neutral-950">
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-3 right-3 z-10 p-2 rounded-lg bg-white/80 hover:bg-white text-black shadow-md backdrop-blur-sm transition-colors"
            title="退出全螢幕"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
          <iframe
            key={`fs-${key}`}
            srcDoc={buildPreviewHtml(displayCode, apiClientCode)}
            className="w-full h-full border-0"
            sandbox="allow-scripts"
            title="Preview"
          />
        </div>
      </>
    );
  }

  // Normal state
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="border-b px-4 py-2 shrink-0 flex items-center justify-between">
        <span className="text-sm font-medium">Preview</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRefresh}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          {code && onShare && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onShare}>
              <Share2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsFullscreen(true)} title="全螢幕">
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleToggleCollapse} title="收合預覽">
            <PanelRightClose className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex-1 relative bg-white">
        <iframe
          key={key}
          srcDoc={buildPreviewHtml(displayCode, apiClientCode)}
          className="w-full h-full border-0"
          sandbox="allow-scripts"
          title="Preview"
        />
      </div>
    </div>
  );
}
