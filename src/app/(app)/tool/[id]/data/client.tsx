"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolDatabaseSection } from "@/components/tool-database-tab";

export function ToolDataClient({ toolId, toolName }: { toolId: string; toolName: string }) {
  const t = useTranslations("toolDatabase");

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href={`/tool/${toolId}/details`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t("backTo")} {toolName}
          </Link>
        </Button>
      </div>

      <h1 className="text-2xl font-bold mb-6">{toolName} — {t("tableTitle")}</h1>

      <ToolDatabaseSection toolId={toolId} />
    </div>
  );
}
