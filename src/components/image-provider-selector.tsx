"use client";

import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown, Image as ImageIcon } from "lucide-react";
import type { ImageProvider } from "@/lib/ai/image-generation";

interface ImageProviderSelectorProps {
  value: ImageProvider | null;
  onChange: (value: ImageProvider | null) => void;
}

const PROVIDERS: Array<{
  id: ImageProvider;
  name: string;
  description: string;
}> = [
  {
    id: "imagen",
    name: "Imagen 4",
    description: "Google 圖片生成，圖生圖走 Gemini 2.5 Flash Image",
  },
  {
    id: "gpt-image",
    name: "GPT-Image-1",
    description: "OpenAI 圖片生成，支援原生 images.edit",
  },
];

export function ImageProviderSelector({
  value,
  onChange,
}: ImageProviderSelectorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-8 w-28 bg-muted rounded animate-pulse" />;
  }

  const current = value ? PROVIDERS.find((p) => p.id === value) : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
          <ImageIcon className="h-3.5 w-3.5 text-pink-500" />
          {current ? current.name : "圖片模型"}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>圖片生成 Provider</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onChange(null)}
          className="flex items-start gap-2.5 py-2.5 cursor-pointer"
        >
          <div className="w-4 flex items-center justify-center shrink-0 mt-0.5">
            {value === null && <Check className="h-4 w-4" />}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-sm">未選</span>
            <span className="text-xs text-muted-foreground">
              不指定，AI 會用預設或依使用者文字判斷
            </span>
          </div>
        </DropdownMenuItem>
        {PROVIDERS.map((p) => (
          <DropdownMenuItem
            key={p.id}
            onClick={() => onChange(p.id)}
            className="flex items-start gap-2.5 py-2.5 cursor-pointer"
          >
            <div className="w-4 flex items-center justify-center shrink-0 mt-0.5">
              {value === p.id && <Check className="h-4 w-4" />}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-sm">{p.name}</span>
              <span className="text-xs text-muted-foreground">
                {p.description}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
