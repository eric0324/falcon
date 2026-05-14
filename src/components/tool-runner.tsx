"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateSandboxApiClient } from "@/lib/sandbox-api-client";

interface ToolRunnerProps {
  code: string;
  toolId?: string;
  dataSources?: string[]; // Preview mode: allowed data sources from conversation
}

function detectComponentName(code: string): string {
  const m = code.match(/export\s+default\s+function\s+([A-Z]\w*)/) ||
    code.match(/export\s+default\s+([A-Z]\w*)\s*;?\s*$/) ||
    Array.from(code.matchAll(/^(?:function|const)\s+([A-Z]\w*)/gm)).pop();
  return m?.[1] || "App";
}

interface ToolErrorMessage {
  kind?: "runtime" | "syntax" | "unhandledrejection";
  message?: string;
  source?: string;
  lineno?: number;
  colno?: number;
  stack?: string;
}

function formatToolError(payload: ToolErrorMessage, sourceCode: string): string {
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

  return [`${label}: ${msg}${loc}`, snippet].filter(Boolean).join("\n\n");
}

function buildToolHtml(code: string, apiClientCode: string): string {
  const componentName = detectComponentName(code);
  let cleanCode = code
    .replace(/^import\s+.*?from\s+['"][^'"]+['"];?\s*\n?/gm, "")
    .replace(/export\s+default\s+/, "");
  if (componentName !== "App") cleanCode += `\nconst App = ${componentName};`;
  const codeJson = JSON.stringify(cleanCode);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script>
    function postError(payload) {
      try { window.parent.postMessage(Object.assign({ type: 'tool-error' }, payload), '*'); } catch (_) {}
    }
    window.addEventListener('error', function(e) {
      postError({
        kind: 'runtime',
        message: e.message || String(e),
        source: e.filename || '',
        lineno: e.lineno || 0,
        colno: e.colno || 0,
        stack: e.error && e.error.stack ? String(e.error.stack) : '',
      });
    });
    window.addEventListener('unhandledrejection', function(e) {
      var r = e.reason;
      postError({
        kind: 'unhandledrejection',
        message: r && r.message ? r.message : String(r),
        stack: r && r.stack ? String(r.stack) : '',
      });
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
  <script>${apiClientCode}</script>
  <script>
    (function() {
      var USER_CODE = ${codeJson};
      var preamble =
        "const { useState, useEffect, useCallback, useMemo, useRef, useReducer, useContext, createContext, Fragment } = React;\\n";
      var epilogue =
        "\\nReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));";
      try {
        var out = Babel.transform(preamble + USER_CODE + epilogue, {
          presets: ['react'],
          filename: 'tool.jsx',
        }).code;
        try { new Function(out)(); }
        catch (runErr) {
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
          lineno: loc && loc.line ? loc.line - 1 : 0,
          colno: loc && loc.column ? loc.column : 0,
        });
      }
    })();
  </script>
</body>
</html>`;
}

export function ToolRunner({ code, toolId, dataSources }: ToolRunnerProps) {
  const [key, setKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const hasDataSources = !!(toolId || (dataSources && dataSources.length > 0));
  // Always use real API client — LLM bridge is a platform capability available to all tools
  const apiClientCode = generateSandboxApiClient();

  // Handle API bridge messages from the sandbox
  const handleMessage = useCallback(
    async (event: MessageEvent) => {
      if (event.data?.type === "tool-error") {
        setError(formatToolError(event.data, code));
        return;
      }

      if (!event.data || event.data.type !== "api-bridge") return;
      const PLATFORM_CAPS = new Set(["llm", "tooldb", "scrape", "transcribe", "image"]);
      const isPlatform = PLATFORM_CAPS.has(event.data.dataSourceId);
      if (!isPlatform && !hasDataSources) return;

      const { id, dataSourceId, action, params } = event.data;

      try {
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

        const iframe = document.querySelector("iframe");
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
        const iframe = document.querySelector("iframe");
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
    [toolId, dataSources, hasDataSources, code]
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  useEffect(() => {
    setKey((prev) => prev + 1);
    setError(null);
  }, [code]);

  const handleRefresh = () => {
    setKey((prev) => prev + 1);
    setError(null);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="border-b px-4 py-2 shrink-0 flex items-center justify-between">
        <span className="text-sm font-medium">Tool</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRefresh}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex-1 relative bg-white">
        {error && (
          <div className="absolute inset-x-0 top-0 bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-600">
            {error}
          </div>
        )}
        <iframe
          key={key}
          srcDoc={buildToolHtml(code, apiClientCode)}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-downloads allow-popups allow-popups-to-escape-sandbox"
          title="Tool Runner"
        />
      </div>
    </div>
  );
}
