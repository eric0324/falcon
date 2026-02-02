"use client";

import { useState, useEffect, useCallback } from "react";
import { SandpackProvider, SandpackPreview } from "@codesandbox/sandpack-react";
import { generateSandboxApiClient } from "@/lib/sandbox-api-client";

interface ToolRunnerProps {
  code: string;
  toolId?: string;
}

export function ToolRunner({ code, toolId }: ToolRunnerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle API bridge messages from the sandbox
  const handleMessage = useCallback(
    async (event: MessageEvent) => {
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
      } catch (error) {
        const iframe = document.querySelector("iframe");
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage(
            {
              type: "api-bridge-response",
              id,
              error: error instanceof Error ? error.message : "Unknown error",
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
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [handleMessage]);

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

  // Remove React imports from user code to avoid duplicates (we provide our own)
  const cleanCode = code.replace(/^import\s+.*?from\s+['"]react['"];?\s*\n?/gm, '');

  const appCode = `
${apiClientCode}

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';

${cleanCode}

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;

  const files = {
    "/App.js": {
      code: appCode,
      active: true,
    },
    "/public/index.html": {
      code: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div id="root"></div>
</body>
</html>`,
    },
  };

  if (!mounted) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <SandpackProvider
        key={code}
        template="react"
        files={files}
        options={{
          externalResources: ["https://cdn.tailwindcss.com"],
        }}
        theme="light"
        style={{ height: "100%", display: "flex", flexDirection: "column" }}
      >
        <SandpackPreview
          showOpenInCodeSandbox={false}
          showRefreshButton={true}
          style={{ flex: 1, minHeight: 0 }}
        />
      </SandpackProvider>
    </div>
  );
}
