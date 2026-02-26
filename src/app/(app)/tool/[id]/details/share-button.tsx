"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShareButtonProps {
  toolId: string;
  visibility: string;
  label: string;
}

export function ShareButton({ toolId, visibility, label }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  if (visibility !== "PUBLIC") {
    return null;
  }

  async function handleCopy() {
    const url = `${window.location.origin}/public/tool/${toolId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const Icon = copied ? Check : Share2;

  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      <Icon className="h-4 w-4 mr-1" />
      {copied ? "已複製" : label}
    </Button>
  );
}
