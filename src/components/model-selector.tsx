"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ModelId, modelInfo, defaultModel } from "@/lib/ai/models";
import { Check, ChevronDown, Sparkles, Zap } from "lucide-react";

interface ModelSelectorProps {
  value: ModelId;
  onChange: (value: ModelId) => void;
}

const STORAGE_KEY = "falcon-preferred-model";

const providerLabel: Record<string, { name: string; color: string }> = {
  claude: { name: "Anthropic", color: "text-amber-600" },
  gpt: { name: "OpenAI", color: "text-green-600" },
  gemini: { name: "Google", color: "text-blue-600" },
};

function getProvider(modelId: string) {
  if (modelId.startsWith("claude")) return providerLabel.claude;
  if (modelId.startsWith("gpt")) return providerLabel.gpt;
  if (modelId.startsWith("gemini")) return providerLabel.gemini;
  return { name: "AI", color: "text-muted-foreground" };
}

function getModelIcon(modelId: string) {
  if (modelId.includes("haiku") || modelId.includes("mini") || modelId.includes("flash")) {
    return <Zap className="h-3.5 w-3.5 text-blue-500" />;
  }
  return <Sparkles className="h-3.5 w-3.5 text-amber-500" />;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const t = useTranslations("models");
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
          {getModelIcon(safeValue)}
          {t(`${safeValue}.name`)}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>{t("selectModel")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(Object.keys(modelInfo) as ModelId[]).map((modelId) => {
          const provider = getProvider(modelId);
          const isSelected = safeValue === modelId;
          return (
            <DropdownMenuItem
              key={modelId}
              onClick={() => handleChange(modelId)}
              className="flex items-start gap-2.5 py-2.5 cursor-pointer"
            >
              <div className="w-4 flex items-center justify-center shrink-0 mt-0.5">
                {isSelected && <Check className="h-4 w-4" />}
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{t(`${modelId}.name`)}</span>
                  <span className={`text-[10px] ${provider.color} bg-muted px-1.5 py-0.5 rounded-full leading-none`}>
                    {provider.name}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {t(`${modelId}.description`)}
                </span>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
