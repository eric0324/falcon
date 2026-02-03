"use client";

import { useTranslations } from "next-intl";
import { Eye, Star, MessageSquare, TrendingUp } from "lucide-react";

interface ToolStatsProps {
  totalUsage: number;
  averageRating: number;
  totalReviews: number;
  weeklyUsage?: number;
  compact?: boolean;
}

export function ToolStats({
  totalUsage,
  averageRating,
  totalReviews,
  weeklyUsage,
  compact = false,
}: ToolStatsProps) {
  const t = useTranslations("tool.stats");
  if (compact) {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Eye className="h-3.5 w-3.5" />
          {totalUsage}
        </span>
        {averageRating > 0 && (
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            {averageRating.toFixed(1)}
          </span>
        )}
        {totalReviews > 0 && (
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
            {totalReviews}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <Eye className="h-4 w-4" />
          <span className="text-sm">{t("totalUsage")}</span>
        </div>
        <p className="text-2xl font-bold">{totalUsage}</p>
      </div>

      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <TrendingUp className="h-4 w-4" />
          <span className="text-sm">{t("weeklyUsage")}</span>
        </div>
        <p className="text-2xl font-bold">{weeklyUsage ?? 0}</p>
      </div>

      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <Star className="h-4 w-4" />
          <span className="text-sm">{t("averageRating")}</span>
        </div>
        <p className="text-2xl font-bold">
          {averageRating > 0 ? averageRating.toFixed(1) : "-"}
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <MessageSquare className="h-4 w-4" />
          <span className="text-sm">{t("totalReviews")}</span>
        </div>
        <p className="text-2xl font-bold">{totalReviews}</p>
      </div>
    </div>
  );
}
