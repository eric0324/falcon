"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateSandboxApiClient } from "@/lib/sandbox-api-client";

interface PreviewPanelProps {
  code: string;
  dataSources?: string[];
  onError?: (error: string | null) => void;
  onShare?: () => void;
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

function buildPreviewHtml(code: string, apiClientCode?: string): string {
  const cleanCode = code
    .replace(/^import\s+.*?from\s+['"][^'"]+['"];?\s*\n?/gm, "")
    .replace(/export\s+default\s+/, "");

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

export function PreviewPanel({ code, dataSources, onError, onShare }: PreviewPanelProps) {
  const [key, setKey] = useState(0);
  const [_error, setError] = useState<string | null>(null);
  const displayCode = code || DEFAULT_CODE;

  const hasBridge = dataSources && dataSources.length > 0;
  const apiClientCode = hasBridge ? generateSandboxApiClient() : `
window.companyAPI = {
  execute: async function(ds, action, params) { console.log('[Mock] execute:', ds, action, params); return {}; },
  query: async function(ds, sql) { console.log('[Mock] query:', ds, sql); return []; },
  list: async function(ds, params) { console.log('[Mock] list:', ds, params); return []; },
  read: async function(ds, params) { console.log('[Mock] read:', ds, params); return {}; },
  search: async function(ds, params) { console.log('[Mock] search:', ds, params); return []; }
};
console.log('[Falcon] Mock API ready');
`;

  // Handle bridge messages from iframe (preview mode)
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

      // Bridge message handling
      if (event.data?.type !== "api-bridge") return;
      console.log("[PreviewPanel Bridge] received:", event.data, "hasBridge:", hasBridge, "dataSources:", dataSources);
      if (!hasBridge) return;

      const { id, dataSourceId, action, params } = event.data;

      try {
        console.log("[PreviewPanel Bridge] fetching /api/bridge:", { dataSources, dataSourceId, action, params });
        const response = await fetch("/api/bridge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataSources, dataSourceId, action, params }),
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
    [onError, hasBridge, dataSources]
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
