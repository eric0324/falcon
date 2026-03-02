"use client";

import { useState } from "react";

interface LogDetailRowProps {
  log: {
    id: string;
    createdAt: string;
    userName: string;
    source: string;
    dataSourceId: string;
    action: string;
    toolName: string | null;
    success: boolean;
    durationMs: number | null;
    rowCount: number | null;
    params: unknown;
    response: unknown;
    error: string | null;
    conversationId: string | null;
    toolId: string | null;
  };
}

export function LogDetailRow({ log }: LogDetailRowProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr
        className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <td className="p-3 text-sm tabular-nums text-muted-foreground">{log.createdAt}</td>
        <td className="p-3 text-sm">{log.userName}</td>
        <td className="p-3 text-sm">{log.source}</td>
        <td className="p-3 text-sm font-mono">{log.dataSourceId}<span className="text-muted-foreground">({log.action})</span></td>
        <td className="p-3 text-sm">{log.source === "bridge" ? (log.toolName || "-") : "-"}</td>
        <td className="p-3 text-center">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${
              log.success ? "bg-green-500" : "bg-red-500"
            }`}
            title={log.success ? "success" : "error"}
          />
        </td>
        <td className="p-3 text-sm text-right tabular-nums">
          {log.durationMs != null ? `${log.durationMs}ms` : "-"}
        </td>
      </tr>
      {open && (
        <tr className="border-b last:border-0 bg-muted/20">
          <td colSpan={7} className="p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-muted-foreground mb-1">Params</p>
                  <pre className="bg-white border rounded p-2 text-xs overflow-auto max-h-48">
                    {log.params
                      ? JSON.stringify(log.params, null, 2)
                      : "-"}
                  </pre>
                </div>
                {log.response != null && (
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">Response</p>
                    <pre className="bg-white border rounded p-2 text-xs overflow-auto max-h-48">
                      {JSON.stringify(log.response, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                {log.error && (
                  <div>
                    <p className="font-medium text-red-600 mb-1">Error</p>
                    <pre className="bg-red-50 border border-red-200 rounded p-2 text-xs overflow-auto max-h-32">
                      {log.error}
                    </pre>
                  </div>
                )}
                {log.rowCount != null && (
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">筆數</p>
                    <p className="text-xs">{log.rowCount}</p>
                  </div>
                )}
                {log.conversationId && (
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">Conversation ID</p>
                    <p className="font-mono text-xs">{log.conversationId}</p>
                  </div>
                )}
                {log.toolId && (
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">Tool ID</p>
                    <p className="font-mono text-xs">{log.toolId}</p>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
