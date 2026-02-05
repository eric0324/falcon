"use client";

import { useEffect, useState } from "react";
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

export function DataSourceSelector({
  value,
  onChange,
  disabled = false,
}: DataSourceSelectorProps) {
  const t = useTranslations("dataSource");
  const tGoogle = useTranslations("google");
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
  }, []);

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
            <span className="text-xs text-muted-foreground ml-auto mr-2">
              {GOOGLE_SERVICES.filter(({ id }) => value.includes(`google_${id}`)).length > 0 &&
                `${GOOGLE_SERVICES.filter(({ id }) => value.includes(`google_${id}`)).length}/${GOOGLE_SERVICES.length}`}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-64">
            {GOOGLE_SERVICES.map(({ id, icon: Icon }) => {
              const isSelected = value.includes(`google_${id}`);

              return (
                <DropdownMenuItem
                  key={id}
                  onClick={(e) => {
                    e.preventDefault();
                    handleToggle(`google_${id}`);
                  }}
                  className="flex items-center gap-2.5 py-2.5 cursor-pointer"
                >
                  <div className="w-4 flex items-center justify-center shrink-0">
                    {isSelected && <Check className="h-4 w-4" />}
                  </div>
                  <Icon className="h-4 w-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm">
                      {tGoogle(`${id}.name`)}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {tGoogle(`${id}.description`)}
                    </p>
                  </div>
                </DropdownMenuItem>
              );
            })}
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
