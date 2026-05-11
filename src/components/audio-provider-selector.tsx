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
import { Check, ChevronDown, Mic } from "lucide-react";
import {
  AUDIO_PROVIDERS,
  type AudioProvider,
} from "@/lib/integrations/openai-audio";

interface AudioProviderSelectorProps {
  value: AudioProvider | null;
  onChange: (value: AudioProvider | null) => void;
}

export function AudioProviderSelector({
  value,
  onChange,
}: AudioProviderSelectorProps) {
  const t = useTranslations("models.audioProviders");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-8 w-28 bg-muted rounded animate-pulse" />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
          <Mic className="h-3.5 w-3.5 text-blue-500" />
          {value ? t(`${value}.name`) : t("trigger")}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>{t("label")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onChange(null)}
          className="flex items-start gap-2.5 py-2.5 cursor-pointer"
        >
          <div className="w-4 flex items-center justify-center shrink-0 mt-0.5">
            {value === null && <Check className="h-4 w-4" />}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-sm">{t("unset.name")}</span>
            <span className="text-xs text-muted-foreground">
              {t("unset.description")}
            </span>
          </div>
        </DropdownMenuItem>
        {AUDIO_PROVIDERS.map((id) => (
          <DropdownMenuItem
            key={id}
            onClick={() => onChange(id)}
            className="flex items-start gap-2.5 py-2.5 cursor-pointer"
          >
            <div className="w-4 flex items-center justify-center shrink-0 mt-0.5">
              {value === id && <Check className="h-4 w-4" />}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-sm">{t(`${id}.name`)}</span>
              <span className="text-xs text-muted-foreground">
                {t(`${id}.description`)}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
