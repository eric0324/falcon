"use client";

import { useToolUsage } from "@/hooks/use-tool-usage";

interface ToolUsageTrackerProps {
  toolId: string;
  source?: "MARKETPLACE" | "DIRECT" | "SHARE";
}

export function ToolUsageTracker({ toolId, source = "DIRECT" }: ToolUsageTrackerProps) {
  useToolUsage({ toolId, source });
  return null;
}
