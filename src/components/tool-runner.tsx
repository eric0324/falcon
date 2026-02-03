"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateSandboxApiClient } from "@/lib/sandbox-api-client";

interface ToolRunnerProps {
  code: string;
  toolId?: string;
}

function buildToolHtml(code: string, apiClientCode: string): string {
  const cleanCode = code
    .replace(/^import\s+.*?from\s+['"][^'"]+['"];?\s*\n?/gm, "")
    .replace(/export\s+default\s+/, "");

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
  <script>${apiClientCode}</script>
  <script type="text/babel">
    const { useState, useEffect, useCallback, useMemo, useRef, useReducer, useContext, createContext, Fragment } = React;

    ${cleanCode}

    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  </script>
  <script>
    window.onerror = (msg) => {
      window.parent.postMessage({ type: 'tool-error', message: String(msg) }, '*');
    };
  </script>
</body>
</html>`;
}

export function ToolRunner({ code, toolId }: ToolRunnerProps) {
  const [key, setKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Generate API client code - use real bridge if toolId provided, otherwise mock
  const apiClientCode = toolId
    ? generateSandboxApiClient()
    : `
window.companyAPI = {
  query: async (source, sql, params) => {
    console.log('[Mock] query:', source, sql, params);
    return [{ id: 1, name: 'Mock Data', status: 'active' }];
  },
  call: async (source, endpoint, data) => {
    console.log('[Mock] call:', source, endpoint, data);
    return { success: true };
  },
  getSources: async () => {
    console.log('[Mock] getSources');
    return [{ name: 'mock_db', displayName: 'Mock Database', type: 'POSTGRES' }];
  }
};
console.log('[Falcon] Mock API ready (no toolId provided)');
`;

  // Handle API bridge messages from the sandbox
  const handleMessage = useCallback(
    async (event: MessageEvent) => {
      if (event.data?.type === "tool-error") {
        setError(event.data.message);
        return;
      }

      if (!event.data || event.data.type !== "api-bridge") return;
      if (!toolId) return;

      const { id, operation, source, sql, params, endpoint, data } = event.data;

      try {
        const response = await fetch("/api/bridge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toolId,
            operation,
            source,
            sql,
            params,
            endpoint,
            data,
          }),
        });

        const result = await response.json();

        // Send response back to iframe
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
    [toolId]
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
          sandbox="allow-scripts"
          title="Tool Runner"
        />
      </div>
    </div>
  );
}
