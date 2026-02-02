"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, Database, Code, List, Search, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: "calling" | "completed";
  result?: unknown;
}

interface ToolCallDisplayProps {
  toolCall: ToolCall;
}

const toolIcons: Record<string, React.ReactNode> = {
  listDataSources: <List className="h-4 w-4" />,
  getDataSourceSchema: <Database className="h-4 w-4" />,
  querySampleData: <Search className="h-4 w-4" />,
  updateCode: <Code className="h-4 w-4" />,
};

const toolLabels: Record<string, string> = {
  listDataSources: "列出資料來源",
  getDataSourceSchema: "取得資料結構",
  querySampleData: "查詢範例資料",
  updateCode: "更新程式碼",
};

export function ToolCallDisplay({ toolCall }: ToolCallDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const icon = toolIcons[toolCall.name] || <Code className="h-4 w-4" />;
  const label = toolLabels[toolCall.name] || toolCall.name;

  // Format result based on tool type
  const formatResult = () => {
    if (!toolCall.result) return null;

    // Special handling for updateCode - only show explanation
    if (toolCall.name === "updateCode" && typeof toolCall.result === "object") {
      const result = toolCall.result as { explanation?: string };
      if (result.explanation) {
        return result.explanation;
      }
    }

    // For other tools, show formatted JSON
    if (typeof toolCall.result === "string") {
      return toolCall.result;
    }
    return JSON.stringify(toolCall.result, null, 2);
  };

  // Don't show args for updateCode (too long)
  const args = toolCall.args || {};
  const shouldShowArgs = toolCall.name !== "updateCode" && Object.keys(args).length > 0;
  const hasDetails = shouldShowArgs || (toolCall.status === "completed" && toolCall.result != null);

  return (
    <div className="bg-muted/50 rounded-lg border text-sm overflow-hidden">
      <button
        type="button"
        onClick={() => hasDetails && setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center gap-3 p-3 w-full text-left",
          hasDetails && "hover:bg-muted/80 cursor-pointer"
        )}
        disabled={!hasDetails}
      >
        {hasDetails && (
          <ChevronRight
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              isExpanded && "rotate-90"
            )}
          />
        )}
        <div className="text-muted-foreground">{icon}</div>
        <span className="font-medium flex-1">{label}</span>
        {toolCall.status === "calling" ? (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        ) : (
          <CheckCircle2 className="h-3 w-3 text-green-500" />
        )}
      </button>

      {isExpanded && hasDetails && (
        <div className="px-3 pb-3 pt-0 border-t">
          {shouldShowArgs && (
            <div className="text-xs text-muted-foreground mt-2 font-mono">
              {Object.entries(args).map(([key, value]) => (
                <span key={key} className="mr-2">
                  {key}: {JSON.stringify(value)}
                </span>
              ))}
            </div>
          )}
          {toolCall.status === "completed" && toolCall.result != null && (
            <div className="text-xs text-muted-foreground mt-2 p-2 bg-background rounded border max-h-48 overflow-auto">
              <pre className="whitespace-pre-wrap">{formatResult()}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
