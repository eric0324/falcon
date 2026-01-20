"use client";

import { useEffect, useRef } from "react";

interface UseToolUsageOptions {
  toolId: string;
  source?: "MARKETPLACE" | "DIRECT" | "SHARE";
}

export function useToolUsage({ toolId, source = "DIRECT" }: UseToolUsageOptions) {
  const usageIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    // Record initial open
    const recordOpen = async () => {
      try {
        const res = await fetch(`/api/tools/${toolId}/usage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source }),
        });
        if (res.ok) {
          const data = await res.json();
          usageIdRef.current = data.id;
        }
      } catch (err) {
        console.error("Failed to record tool usage:", err);
      }
    };

    recordOpen();
    startTimeRef.current = Date.now();

    // Update duration on page leave
    const updateDuration = () => {
      if (!usageIdRef.current) return;

      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);

      // Use sendBeacon for reliability on page unload
      navigator.sendBeacon(
        `/api/tools/${toolId}/usage`,
        JSON.stringify({
          usageId: usageIdRef.current,
          duration,
        })
      );
    };

    window.addEventListener("beforeunload", updateDuration);
    window.addEventListener("pagehide", updateDuration);

    return () => {
      updateDuration();
      window.removeEventListener("beforeunload", updateDuration);
      window.removeEventListener("pagehide", updateDuration);
    };
  }, [toolId, source]);
}
