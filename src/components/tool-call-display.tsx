"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, Database, Code, List, Search, ChevronRight, Cloud, FileEdit, Wifi, AlertCircle, ExternalLink, BookOpen, BarChart3, LineChart, Megaphone, Github } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: "calling" | "completed";
  result?: unknown;
}

interface ToolCallDisplayProps {
  toolCall: ToolCall;
  onAction?: (action: string, payload: unknown) => void;
}

const toolIcons: Record<string, React.ReactNode> = {
  listDataSources: <List className="h-4 w-4" />,
  getDataSourceSchema: <Database className="h-4 w-4" />,
  querySampleData: <Search className="h-4 w-4" />,
  updateCode: <Code className="h-4 w-4" />,
  googleSearch: <Cloud className="h-4 w-4" />,
  googleWrite: <FileEdit className="h-4 w-4" />,
  googleStatus: <Wifi className="h-4 w-4" />,
  notionSearch: <BookOpen className="h-4 w-4" />,
  slackSearch: <Search className="h-4 w-4" />,
  asanaSearch: <List className="h-4 w-4" />,
  plausibleQuery: <BarChart3 className="h-4 w-4" />,
  ga4Query: <LineChart className="h-4 w-4" />,
  metaAdsQuery: <Megaphone className="h-4 w-4" />,
  githubQuery: <Github className="h-4 w-4" />,
  listTables: <Database className="h-4 w-4" />,
  getTableSchema: <Database className="h-4 w-4" />,
  queryDatabase: <Search className="h-4 w-4" />,
};

// Labels when tool is being called (in progress)
const toolCallingLabels: Record<string, string> = {
  listDataSources: "Fetching data sources...",
  getDataSourceSchema: "Analyzing schema...",
  querySampleData: "Querying data...",
  updateCode: "Thinking...",
  updateDocument: "Writing document...",
  googleSearch: "Searching Google...",
  googleWrite: "Writing to Google...",
  googleStatus: "Checking connection...",
  notionSearch: "Searching Notion...",
  slackSearch: "Searching Slack...",
  asanaSearch: "Searching Asana...",
  plausibleQuery: "Querying Plausible...",
  ga4Query: "Querying GA4...",
  metaAdsQuery: "Querying Meta Ads...",
  githubQuery: "Querying GitHub...",
  listTables: "Listing tables...",
  getTableSchema: "Analyzing table schema...",
  queryDatabase: "Querying database...",
  suggestDataSources: "Checking data sources...",
};

// Labels when tool is completed
const toolCompletedLabels: Record<string, string> = {
  listDataSources: "Fetched data sources",
  getDataSourceSchema: "Schema analyzed",
  querySampleData: "Data queried",
  updateCode: "Code generated",
  updateDocument: "Document written",
  googleSearch: "Google search complete",
  googleWrite: "Written to Google",
  googleStatus: "Connection checked",
  notionSearch: "Notion search complete",
  slackSearch: "Slack search complete",
  asanaSearch: "Asana search complete",
  plausibleQuery: "Plausible query complete",
  ga4Query: "GA4 query complete",
  metaAdsQuery: "Meta Ads query complete",
  githubQuery: "GitHub query complete",
  listTables: "Tables listed",
  getTableSchema: "Table schema analyzed",
  queryDatabase: "Database queried",
  suggestDataSources: "Data sources suggested",
};

export function ToolCallDisplay({ toolCall, onAction }: ToolCallDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Hide suggestDataSources from tool call list (rendered as overlay in chat page)
  if (toolCall.name === "suggestDataSources") return null;

  const icon = toolIcons[toolCall.name] || <Code className="h-4 w-4" />;
  const label = toolCall.status === "calling"
    ? (toolCallingLabels[toolCall.name] || `Running ${toolCall.name}...`)
    : (toolCompletedLabels[toolCall.name] || `${toolCall.name} complete`);

  // Check if result indicates needs connection
  const result = toolCall.result as { needsConnection?: boolean; service?: string; error?: string } | undefined;
  const needsConnection = result?.needsConnection === true;
  const serviceToConnect = result?.service;

  // Handle connect button click
  const handleConnect = () => {
    if (serviceToConnect) {
      window.location.href = `/api/google/authorize?service=${serviceToConnect}`;
    }
  };

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

  // Hide internal details for certain tools
  const hiddenTools = new Set(["updateCode", "listTables", "getTableSchema", "queryDatabase"]);
  const args = toolCall.args || {};
  const shouldShowArgs = !hiddenTools.has(toolCall.name) && Object.keys(args).length > 0;
  const shouldShowResult = !hiddenTools.has(toolCall.name);
  const hasDetails = shouldShowArgs || (shouldShowResult && toolCall.status === "completed" && toolCall.result != null);

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
        ) : needsConnection ? (
          <AlertCircle className="h-3 w-3 text-amber-500" />
        ) : (
          <CheckCircle2 className="h-3 w-3 text-green-500" />
        )}
      </button>

      {/* Show connect prompt when service needs authorization */}
      {needsConnection && serviceToConnect && (
        <div className="px-3 pb-3 border-t bg-amber-50 dark:bg-amber-950/20">
          <div className="flex items-center gap-3 pt-3">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300 flex-1">
              {result?.error || `Google ${serviceToConnect} connection required`}
            </p>
            <Button
              size="sm"
              onClick={handleConnect}
              className="shrink-0 gap-1.5"
            >
              <ExternalLink className="h-3 w-3" />
              Connect
            </Button>
          </div>
        </div>
      )}

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
          {shouldShowResult && toolCall.status === "completed" && toolCall.result != null && (
            <div className="text-xs text-muted-foreground mt-2 p-2 bg-background rounded border max-h-48 overflow-auto">
              <pre className="whitespace-pre-wrap">{formatResult()}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
