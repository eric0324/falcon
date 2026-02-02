"use client";

import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ModelId, modelInfo, defaultModel } from "@/lib/ai/models";
import { ChevronDown, Sparkles, Zap } from "lucide-react";

interface ModelSelectorProps {
  value: ModelId;
  onChange: (value: ModelId) => void;
}

const STORAGE_KEY = "falcon-preferred-model";

const providerLabel: Record<string, { name: string; color: string }> = {
  claude: { name: "Anthropic", color: "text-amber-600" },
  gpt: { name: "OpenAI", color: "text-green-600" },
};

function getProvider(modelId: string) {
  if (modelId.startsWith("claude")) return providerLabel.claude;
  if (modelId.startsWith("gpt")) return providerLabel.gpt;
  return { name: "AI", color: "text-muted-foreground" };
}

function getModelIcon(modelId: string) {
  if (modelId.includes("haiku") || modelId.includes("mini")) {
    return <Zap className="h-3.5 w-3.5 text-blue-500" />;
  }
  return <Sparkles className="h-3.5 w-3.5 text-amber-500" />;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in modelInfo) {
      onChange(stored as ModelId);
    } else if (stored) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [onChange]);

  const handleChange = (newValue: string) => {
    if (newValue in modelInfo) {
      onChange(newValue as ModelId);
      localStorage.setItem(STORAGE_KEY, newValue);
    }
  };

  if (!mounted) {
    return <div className="h-8 w-32 bg-muted rounded animate-pulse" />;
  }

  const safeValue = value in modelInfo ? value : defaultModel;
  const currentModel = modelInfo[safeValue];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
          {getModelIcon(safeValue)}
          {currentModel.name}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>選擇模型</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={safeValue} onValueChange={handleChange}>
          {(Object.keys(modelInfo) as ModelId[]).map((modelId) => {
            const info = modelInfo[modelId];
            const provider = getProvider(modelId);
            return (
              <DropdownMenuRadioItem
                key={modelId}
                value={modelId}
                className="flex items-start gap-2.5 py-2.5 cursor-pointer"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{info.name}</span>
                    <span className={`text-[10px] ${provider.color} bg-muted px-1.5 py-0.5 rounded-full leading-none`}>
                      {provider.name}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {info.description}
                  </span>
                </div>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
