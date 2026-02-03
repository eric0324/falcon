"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Package, Search, Star, TrendingUp } from "lucide-react";

interface EmptyStateProps {
  type: "no-tools" | "no-results" | "no-reviews" | "no-trending";
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

const defaultContent: Record<string, {
  icon: typeof Package;
  titleKey: string;
  descriptionKey: string;
  actionLabelKey?: string;
  actionHref?: string;
}> = {
  "no-tools": {
    icon: Package,
    titleKey: "noTools.title",
    descriptionKey: "noTools.description",
    actionLabelKey: "noTools.action",
    actionHref: "/chat",
  },
  "no-results": {
    icon: Search,
    titleKey: "noResults.title",
    descriptionKey: "noResults.description",
    actionLabelKey: "noResults.action",
    actionHref: "/marketplace",
  },
  "no-reviews": {
    icon: Star,
    titleKey: "noReviews.title",
    descriptionKey: "noReviews.description",
  },
  "no-trending": {
    icon: TrendingUp,
    titleKey: "noTrending.title",
    descriptionKey: "noTrending.description",
  },
};

export function EmptyState({
  type,
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  const t = useTranslations("emptyState");
  const content = defaultContent[type];
  const Icon = content.icon;

  return (
    <div className="text-center py-16">
      <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">{title || t(content.titleKey)}</h3>
      <p className="text-muted-foreground mb-4">
        {description || t(content.descriptionKey)}
      </p>
      {(actionHref || content.actionHref) && (
        <Button asChild>
          <Link href={actionHref || content.actionHref!}>
            {actionLabel || (content.actionLabelKey ? t(content.actionLabelKey) : "")}
          </Link>
        </Button>
      )}
    </div>
  );
}
