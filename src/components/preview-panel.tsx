"use client";

import { useEffect, useState } from "react";
import {
  SandpackProvider,
  SandpackPreview,
} from "@codesandbox/sandpack-react";

interface PreviewPanelProps {
  code: string;
}

// Mock API for preview - matches the new companyAPI format
const MOCK_API = `
window.companyAPI = {
  // Query database mock
  query: async (source, sql, params) => {
    console.log('%c[模擬查詢]', 'color: #d97706', source, sql, params);
    // Return sample data based on SQL keywords
    if (sql.toLowerCase().includes('orders')) {
      return [
        { id: 1, user_id: 101, total: 1500, status: 'completed', created_at: '2024-01-15' },
        { id: 2, user_id: 102, total: 890, status: 'pending', created_at: '2024-01-16' },
        { id: 3, user_id: 103, total: 2100, status: 'completed', created_at: '2024-01-17' },
      ];
    }
    if (sql.toLowerCase().includes('users') || sql.toLowerCase().includes('employees')) {
      return [
        { id: 1, name: 'Alice Chen', email: 'alice@company.com', department: 'Engineering' },
        { id: 2, name: 'Bob Smith', email: 'bob@company.com', department: 'Marketing' },
        { id: 3, name: 'Carol Wang', email: 'carol@company.com', department: 'Sales' },
      ];
    }
    if (sql.toLowerCase().includes('products')) {
      return [
        { id: 1, name: 'Widget A', price: 99, stock: 150 },
        { id: 2, name: 'Widget B', price: 149, stock: 75 },
        { id: 3, name: 'Widget C', price: 199, stock: 30 },
      ];
    }
    // Default mock data
    return [
      { id: 1, name: 'Sample Data 1', value: 100 },
      { id: 2, name: 'Sample Data 2', value: 200 },
    ];
  },

  // Call REST API mock
  call: async (source, endpoint, data) => {
    console.log('%c[模擬 API 呼叫]', 'color: #d97706', source, endpoint, data);
    return { success: true, message: 'Mock API call completed' };
  },

  // Get available sources mock
  getSources: async () => {
    console.log('%c[模擬取得資料源]', 'color: #d97706');
    return [
      { name: 'db_main', displayName: '主資料庫', type: 'POSTGRES', description: '公司主要營運資料' },
      { name: 'hr_api', displayName: 'HR 系統', type: 'REST_API', description: '人事系統 API' },
    ];
  }
};

console.log('%c[Falcon Preview] 使用模擬資料，發布後才會連接真實資料庫', 'color: #d97706; font-weight: bold');
`;

const DEFAULT_CODE = `
export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center text-gray-500">
        <p className="text-lg font-medium">Preview will appear here</p>
        <p className="text-sm mt-1">Start typing to generate your tool</p>
      </div>
    </div>
  );
}
`;

export function PreviewPanel({ code }: PreviewPanelProps) {
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (code) {
      setKey((prev) => prev + 1);
    }
  }, [code]);

  // Remove React imports from user code to avoid duplicates (we provide our own)
  const cleanCode = code
    ? code.replace(/^import\s+.*?from\s+['"]react['"];?\s*\n?/gm, '')
    : null;

  const appCode = `
${MOCK_API}

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';

${cleanCode || DEFAULT_CODE}

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
        files={files}
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
