"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ToolError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Tool Error]", error);
  }, [error]);

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-md">
        <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {error.message || String(error)}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground mb-4">
            Digest: {error.digest}
          </p>
        )}
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
