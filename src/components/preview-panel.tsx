"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PreviewPanelProps {
  code: string;
  onError?: (error: string | null) => void;
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

function buildPreviewHtml(code: string): string {
  // Clean code: remove imports, handle export default
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

export function PreviewPanel({ code, onError }: PreviewPanelProps) {
  const [key, setKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const displayCode = code || DEFAULT_CODE;

  const handleMessage = useCallback((event: MessageEvent) => {
    if (event.data?.type === "preview-error") {
      setError(event.data.message);
      onError?.(event.data.message);
    } else if (event.data?.type === "preview-success") {
      setError(null);
      onError?.(null);
    }
  }, [onError]);

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
        <div>
          <span className="text-sm font-medium">Preview</span>
          {code && !error && <span className="ml-2 text-xs text-green-600">● Live</span>}
          {error && <span className="ml-2 text-xs text-red-600">● Error</span>}
        </div>
        <div className="flex items-center gap-2">
          {code && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
              使用模擬資料
            </span>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRefresh}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex-1 relative bg-white">
        <iframe
          key={key}
          srcDoc={buildPreviewHtml(displayCode)}
          className="w-full h-full border-0"
          sandbox="allow-scripts"
          title="Preview"
        />
      </div>
    </div>
  );
}
