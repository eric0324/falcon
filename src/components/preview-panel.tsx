"use client";

import { useEffect, useState } from "react";
import {
  SandpackProvider,
  SandpackPreview,
} from "@codesandbox/sandpack-react";

interface PreviewPanelProps {
  code: string;
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

export function PreviewPanel({ code }: PreviewPanelProps) {
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (code) {
      setKey((prev) => prev + 1);
    }
  }, [code]);

  // Clean user code - remove React imports
  const cleanCode = code
    ? code.replace(/^import\s+.*?from\s+['"]react['"];?\s*\n?/gm, "")
    : "";

  const appCode = cleanCode || DEFAULT_CODE;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="border-b px-4 py-2 shrink-0 flex items-center justify-between">
        <div>
          <span className="text-sm font-medium">Preview</span>
          {code && <span className="ml-2 text-xs text-green-600">● Live</span>}
        </div>
        {code && (
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
            使用模擬資料
          </span>
        )}
      </div>
      <SandpackProvider
        key={key}
        template="react"
        files={{
          "/App.js": appCode,
        }}
        options={{
          externalResources: ["https://cdn.tailwindcss.com"],
        }}
        theme="light"
        style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
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
