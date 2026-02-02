"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Database, Globe, Loader2, ChevronDown } from "lucide-react";

interface DataSource {
  id: string;
  name: string;
  displayName: string;
  type: string;
  description: string | null;
}

interface DataSourceSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

function getTypeIcon(type: string) {
  if (type === "REST_API") {
    return <Globe className="h-3.5 w-3.5 text-blue-500" />;
  }
  return <Database className="h-3.5 w-3.5 text-green-500" />;
}

export function DataSourceSelector({ value, onChange, disabled }: DataSourceSelectorProps) {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/datasources")
      .then((res) => res.json())
      .then((data) => {
        setDataSources(data);
        setIsLoading(false);
      })
      .catch(() => {
        setDataSources([]);
        setIsLoading(false);
      });
  }, []);

  const toggleSource = (name: string) => {
    if (value.includes(name)) {
      onChange(value.filter((v) => v !== name));
    } else {
      onChange([...value, name]);
    }
  };

  const selectedCount = value.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled || isLoading}>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Database className="h-3.5 w-3.5" />
          )}
          資料來源
          {selectedCount > 0 && (
            <span className="ml-1 bg-primary/10 text-primary px-1.5 rounded-full">
              {selectedCount}
            </span>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>選擇資料來源</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {dataSources.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            沒有可用的資料來源
          </div>
        ) : (
          dataSources.map((source) => (
            <DropdownMenuCheckboxItem
              key={source.name}
              checked={value.includes(source.name)}
              onCheckedChange={() => toggleSource(source.name)}
              onSelect={(e) => e.preventDefault()}
            >
              <div className="flex items-center gap-2">
                {getTypeIcon(source.type)}
                <div className="flex flex-col">
                  <span className="font-medium">{source.displayName}</span>
                  {source.description && (
                    <span className="text-xs text-muted-foreground">
                      {source.description}
                    </span>
                  )}
                </div>
              </div>
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
