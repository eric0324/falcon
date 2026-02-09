"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Check,
  ChevronDown,
  Database,
  Loader2,
  FileSpreadsheet,
  FolderOpen,
  Calendar,
  Mail,
  Link,
  BookOpen,
  MessageSquare,
} from "lucide-react";

interface DataSource {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  type: string;
  capabilities: {
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
  };
}

type GoogleServiceType = "sheets" | "drive" | "calendar" | "gmail";

const GOOGLE_SERVICES: {
  id: GoogleServiceType;
  icon: typeof FileSpreadsheet;
}[] = [
  { id: "sheets", icon: FileSpreadsheet },
  { id: "drive", icon: FolderOpen },
  { id: "calendar", icon: Calendar },
  { id: "gmail", icon: Mail },
];

interface DataSourceSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

type GoogleConnectionStatus = {
  sheets: boolean;
  drive: boolean;
  calendar: boolean;
  gmail: boolean;
};

type IntegrationStatus = {
  notion: boolean;
  slack: boolean;
};

export function DataSourceSelector({
  value,
  onChange,
  disabled = false,
}: DataSourceSelectorProps) {
  const t = useTranslations("dataSource");
  const tGoogle = useTranslations("google");
  const tIntegrations = useTranslations("integrations");
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [googleStatus, setGoogleStatus] = useState<GoogleConnectionStatus>({
    sheets: false,
    drive: false,
    calendar: false,
    gmail: false,
  });
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus>({
    notion: false,
    slack: false,
  });
  const [connectingService, setConnectingService] = useState<string | null>(null);

  // Fetch Google connection status
  const fetchGoogleStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/google/status");
      if (res.ok) {
        const data = await res.json();
        if (data.connected) {
          setGoogleStatus(data.connected);
        }
      }
    } catch {
      // Silently fail
    }
  }, []);

  // Fetch integration status
  const fetchIntegrationStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations/status");
      if (res.ok) {
        const data = await res.json();
        setIntegrationStatus(data);
      }
    } catch {
      // Silently fail
    }
  }, []);

  // Fetch data sources
  useEffect(() => {
    async function fetchDataSources() {
      try {
        const res = await fetch("/api/data-sources");
        if (res.ok) {
          const data = await res.json();
          setDataSources(data);
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false);
      }
    }
    fetchDataSources();
    fetchGoogleStatus();
    fetchIntegrationStatus();
  }, [fetchGoogleStatus, fetchIntegrationStatus]);

  // Handle Google service connect
  const handleGoogleConnect = (service: GoogleServiceType) => {
    setConnectingService(service);
    // Redirect to OAuth authorization
    window.location.href = `/api/google/authorize?service=${service}`;
  };

  const handleToggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  // Calculate selected count including Google services
  const selectedCount = value.length;
  const getSelectedNames = () => {
    const names: string[] = [];

    // Regular data sources
    dataSources.forEach((ds) => {
      if (value.includes(ds.id)) {
        names.push(ds.displayName);
      }
    });

    // Google services
    GOOGLE_SERVICES.forEach(({ id }) => {
      if (value.includes(`google_${id}`)) {
        names.push(tGoogle(`${id}.name`));
      }
    });

    // Integrations
    if (value.includes("notion")) {
      names.push(tIntegrations("notion.name"));
    }
    if (value.includes("slack")) {
      names.push(tIntegrations("slack.name"));
    }

    return names;
  };

  const selectedNames = getSelectedNames();

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" disabled>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {t("loading")}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={disabled}
        >
          <Database className="h-3.5 w-3.5" />
          {selectedCount === 0
            ? t("select")
            : selectedCount === 1
              ? selectedNames[0]
              : t("selectedCount", { count: selectedCount })}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        <DropdownMenuLabel>{t("title")}</DropdownMenuLabel>

        {/* Regular Data Sources */}
        {dataSources.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {dataSources.map((ds) => {
              const isSelected = value.includes(ds.id);

              return (
                <DropdownMenuItem
                  key={ds.id}
                  onClick={(e) => {
                    e.preventDefault();
                    handleToggle(ds.id);
                  }}
                  className="flex items-start gap-2.5 py-2.5 cursor-pointer"
                >
                  <div className="w-4 flex items-center justify-center shrink-0 mt-0.5">
                    {isSelected && <Check className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm truncate">
                      {ds.displayName}
                    </span>
                    {ds.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {ds.description}
                      </p>
                    )}
                  </div>
                </DropdownMenuItem>
              );
            })}
          </>
        )}

        {/* Google Services - Sub Menu */}
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="flex items-center gap-2.5 py-2.5 cursor-pointer">
            <div className="w-4 flex items-center justify-center shrink-0">
              {GOOGLE_SERVICES.some(({ id }) => value.includes(`google_${id}`)) && (
                <Check className="h-4 w-4" />
              )}
            </div>
            <span className="font-medium text-sm">{tGoogle("title")}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-80">
            {GOOGLE_SERVICES.map(({ id, icon: Icon }) => {
              const isSelected = value.includes(`google_${id}`);
              const isConnected = googleStatus[id];
              const isConnecting = connectingService === id;

              return (
                <DropdownMenuItem
                  key={id}
                  onClick={(e) => {
                    e.preventDefault();
                    if (isConnected) {
                      handleToggle(`google_${id}`);
                    }
                  }}
                  className="flex items-start gap-2 py-2.5 cursor-pointer"
                >
                  <div className="w-4 flex items-center justify-center shrink-0 mt-0.5">
                    {isSelected && isConnected && <Check className="h-4 w-4" />}
                  </div>
                  <Icon className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm block">
                      {tGoogle(`${id}.name`)}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {tGoogle(`${id}.description`)}
                    </p>
                  </div>
                  <div className="w-14 flex justify-end shrink-0 mt-0.5">
                    {isConnecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : !isConnected ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGoogleConnect(id);
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        title={tGoogle("connect")}
                      >
                        <Link className="h-3 w-3" />
                        {tGoogle("connect")}
                      </button>
                    ) : null}
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Third-party Services - Sub Menu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="flex items-center gap-2.5 py-2.5 cursor-pointer">
            <div className="w-4 flex items-center justify-center shrink-0">
              {(value.includes("notion") || value.includes("slack")) && <Check className="h-4 w-4" />}
            </div>
            <span className="font-medium text-sm">{tIntegrations("thirdParty")}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-80">
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                if (integrationStatus.notion) {
                  handleToggle("notion");
                }
              }}
              className="flex items-start gap-2 py-2.5 cursor-pointer"
            >
              <div className="w-4 flex items-center justify-center shrink-0 mt-0.5">
                {value.includes("notion") && integrationStatus.notion && <Check className="h-4 w-4" />}
              </div>
              <BookOpen className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-sm block">
                  {tIntegrations("notion.name")}
                </span>
                <p className="text-xs text-muted-foreground">
                  {tIntegrations("notion.description")}
                </p>
              </div>
              <div className="w-14 flex justify-end shrink-0 mt-0.5">
                {!integrationStatus.notion && (
                  <span className="text-xs text-muted-foreground">
                    {tIntegrations("notConnected")}
                  </span>
                )}
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                if (integrationStatus.slack) {
                  handleToggle("slack");
                }
              }}
              className="flex items-start gap-2 py-2.5 cursor-pointer"
            >
              <div className="w-4 flex items-center justify-center shrink-0 mt-0.5">
                {value.includes("slack") && integrationStatus.slack && <Check className="h-4 w-4" />}
              </div>
              <MessageSquare className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-sm block">
                  {tIntegrations("slack.name")}
                </span>
                <p className="text-xs text-muted-foreground">
                  {tIntegrations("slack.description")}
                </p>
              </div>
              <div className="w-14 flex justify-end shrink-0 mt-0.5">
                {!integrationStatus.slack && (
                  <span className="text-xs text-muted-foreground">
                    {tIntegrations("notConnected")}
                  </span>
                )}
              </div>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Clear All */}
        {selectedCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                onChange([]);
              }}
              className="text-xs text-muted-foreground justify-center"
            >
              {t("clearAll")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
