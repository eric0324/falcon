"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Share2, Maximize2, Minimize2, PanelRightClose, PanelRightOpen, AlertTriangle, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VersionHistoryButton } from "@/components/version-history-button";
import { generateSandboxApiClient } from "@/lib/sandbox-api-client";

interface PreviewPanelProps {
  code: string;
  toolId?: string | null;
  dataSources?: string[];
  error?: string | null;
  fixDisabled?: boolean;
  onError?: (error: string | null) => void;
  onRequestFix?: () => void;
  onShare?: () => void;
  onCollapsedChange?: (collapsed: boolean) => void;
  onCodeRestored?: (code: string) => void;
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

interface PreviewErrorMessage {
  kind?: "runtime" | "syntax" | "unhandledrejection";
  message?: string;
  source?: string;
  lineno?: number;
  colno?: number;
  stack?: string;
}

/**
 * Turn the raw error payload from the iframe into a user/AI-readable string
 * that includes line number and a 3-line code snippet around the failure point.
 */
function formatPreviewError(payload: PreviewErrorMessage, sourceCode: string): string {
  const kind = payload.kind ?? "runtime";
  const label = kind === "syntax" ? "SyntaxError" : kind === "unhandledrejection" ? "UnhandledRejection" : "Error";
  const msg = payload.message?.trim() || "(no message)";
  const line = payload.lineno && payload.lineno > 0 ? payload.lineno : undefined;
  const col = payload.colno && payload.colno > 0 ? payload.colno : undefined;
  const loc = line ? ` (line ${line}${col ? `:${col}` : ""})` : "";

  let snippet = "";
  if (line && sourceCode) {
    const lines = sourceCode.split("\n");
    const start = Math.max(0, line - 2);
    const end = Math.min(lines.length, line + 1);
    snippet = lines
      .slice(start, end)
      .map((l, i) => {
        const n = start + i + 1;
        const marker = n === line ? ">" : " ";
        return `${marker} ${String(n).padStart(3)} | ${l}`;
      })
      .join("\n");
  }

  return [`${label}: ${msg}${loc}`, snippet, payload.stack].filter(Boolean).join("\n\n");
}

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
  // Pass user code to the iframe as a JSON-escaped string so we can manually
  // call Babel.transform() in try/catch and surface SyntaxError.loc properly.
  const codeJson = JSON.stringify(cleanCode);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script>
    // Install error listeners FIRST so any later script errors are captured
    // with full detail. \`crossorigin="anonymous"\` below allows the iframe
    // to see real errors from CDN scripts instead of "Script error.".
    function postError(payload) {
      try { window.parent.postMessage(Object.assign({ type: 'preview-error' }, payload), '*'); } catch (_) {}
    }
    window.addEventListener('error', function(e) {
      var stack = e.error && e.error.stack ? String(e.error.stack) : '';
      postError({
        kind: 'runtime',
        message: e.message || String(e),
        source: e.filename || '',
        lineno: e.lineno || 0,
        colno: e.colno || 0,
        stack: stack,
      });
    });
    window.addEventListener('unhandledrejection', function(e) {
      var reason = e.reason;
      var message = reason && reason.message ? reason.message : String(reason);
      var stack = reason && reason.stack ? String(reason.stack) : '';
      postError({ kind: 'unhandledrejection', message: message, stack: stack });
    });
  </script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>html, body, #root { margin: 0; padding: 0; min-height: 100%; }</style>
</head>
<body>
  <div id="root"></div>
  ${apiScript}
  <script>
    (function() {
      var USER_CODE = ${codeJson};
      var preamble =
        "const { useState, useEffect, useCallback, useMemo, useRef, useReducer, useContext, createContext, Fragment } = React;\\n";
      var epilogue =
        "\\nReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));\\n" +
        "window.parent.postMessage({ type: 'preview-success' }, '*');";
      try {
        var out = Babel.transform(preamble + USER_CODE + epilogue, {
          presets: ['react'],
          filename: 'tool.jsx',
        }).code;
        try {
          // Wrap in a function so internal errors propagate as runtime errors
          // (caught by the window 'error' listener with proper lineno).
          new Function(out)();
        } catch (runErr) {
          postError({
            kind: 'runtime',
            message: runErr && runErr.message ? runErr.message : String(runErr),
            stack: runErr && runErr.stack ? String(runErr.stack) : '',
          });
        }
      } catch (compileErr) {
        var loc = compileErr && compileErr.loc;
        postError({
          kind: 'syntax',
          message: compileErr && compileErr.message ? compileErr.message : String(compileErr),
          lineno: loc && loc.line ? loc.line - 1 : 0, // -1 to skip preamble line
          colno: loc && loc.column ? loc.column : 0,
        });
      }
    })();
  </script>
</body>
</html>`;
}

export function PreviewPanel({ code, toolId, dataSources, error, fixDisabled, onError, onRequestFix, onShare, onCollapsedChange, onCodeRestored }: PreviewPanelProps) {
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
        const formatted = formatPreviewError(event.data, displayCode);
        setError(formatted);
        onError?.(formatted);
        return;
      }
      if (event.data?.type === "preview-success") {
        setError(null);
        onError?.(null);
        return;
      }

      if (event.data?.type !== "api-bridge") return;
      const PLATFORM_CAPS = new Set(["llm", "tooldb", "scrape", "transcribe", "image"]);
      const isPlatform = PLATFORM_CAPS.has(event.data.dataSourceId);
      if (!isPlatform && !hasDataSources) return;

      const { id, dataSourceId, action, params } = event.data;

      try {
        console.log("[PreviewPanel Bridge] fetching /api/bridge:", { dataSources, dataSourceId, action, params });
        const response = await fetch("/api/bridge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(toolId ? { toolId } : {}),
            dataSources,
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
    [onError, hasDataSources, toolId, dataSources, displayCode]
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
            sandbox="allow-scripts allow-downloads allow-popups allow-popups-to-escape-sandbox"
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
          {toolId && (
            <VersionHistoryButton
              toolId={toolId}
              onRestored={(tool) => onCodeRestored?.(tool.code)}
            />
          )}
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
      <div className="flex-1 relative bg-white min-h-0">
        <iframe
          key={key}
          srcDoc={buildPreviewHtml(displayCode, apiClientCode)}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-downloads allow-popups allow-popups-to-escape-sandbox"
          title="Preview"
        />
      </div>
      {error && (
        <div className="shrink-0 border-t bg-red-50 dark:bg-red-950/30">
          <div className="px-3 py-2 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <div className="flex-1 min-w-0 max-h-32 overflow-y-auto">
              <div className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">
                Preview 錯誤
              </div>
              <pre className="text-xs font-mono text-red-700 dark:text-red-200 whitespace-pre-wrap break-words">
                {error}
              </pre>
            </div>
            {onRequestFix && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0 h-7 gap-1 border-red-300 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-200 dark:hover:bg-red-900/40"
                onClick={onRequestFix}
                disabled={fixDisabled}
              >
                <Wand2 className="h-3 w-3" />
                修正
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
