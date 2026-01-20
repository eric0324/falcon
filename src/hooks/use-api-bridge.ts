"use client";

import { useCallback, useEffect, useRef } from "react";

interface ApiBridgeMessage {
  type: "api-bridge";
  id: string;
  operation: "query" | "call" | "getSources";
  source?: string;
  sql?: string;
  params?: unknown[];
  endpoint?: string;
  data?: unknown;
}

interface ApiBridgeOptions {
  toolId: string;
  enabled?: boolean;
  onLog?: (message: string) => void;
}

function isApiBridgeMessage(data: unknown): data is ApiBridgeMessage {
  if (typeof data !== "object" || data === null) return false;
  const msg = data as Record<string, unknown>;
  return (
    msg.type === "api-bridge" &&
    typeof msg.id === "string" &&
    typeof msg.operation === "string" &&
    ["query", "call", "getSources"].includes(msg.operation as string)
  );
}

export function useApiBridge(options: ApiBridgeOptions) {
  const { toolId, enabled = true, onLog } = options;
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const sendResponse = useCallback(
    (
      iframe: HTMLIFrameElement,
      id: string,
      result?: unknown,
      error?: string
    ) => {
      iframe.contentWindow?.postMessage(
        {
          type: "api-bridge-response",
          id,
          result,
          error,
        },
        "*"
      );
    },
    []
  );

  const handleMessage = useCallback(
    async (event: MessageEvent) => {
      // Validate message format
      if (!isApiBridgeMessage(event.data)) {
        return;
      }

      const { id, operation, source, sql, params, endpoint, data } = event.data;

      // Find the iframe that sent the message
      const iframe = iframeRef.current;
      if (!iframe || event.source !== iframe.contentWindow) {
        return;
      }

      onLog?.(`[API Bridge] Received ${operation} request`);

      try {
        const response = await fetch("/api/bridge", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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

        if (!response.ok) {
          onLog?.(`[API Bridge] Error: ${result.error || "Unknown error"}`);
          sendResponse(iframe, id, undefined, result.error || "API call failed");
          return;
        }

        onLog?.(`[API Bridge] ${operation} completed successfully`);
        sendResponse(iframe, id, result.data);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        onLog?.(`[API Bridge] Error: ${errorMessage}`);
        sendResponse(iframe, id, undefined, errorMessage);
      }
    },
    [toolId, sendResponse, onLog]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [enabled, handleMessage]);

  // Function to register the iframe reference
  const registerIframe = useCallback((iframe: HTMLIFrameElement | null) => {
    iframeRef.current = iframe;
  }, []);

  return {
    registerIframe,
  };
}
