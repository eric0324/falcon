"use client";

import Link from "next/link";
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
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}> = {
  "no-tools": {
    icon: Package,
    title: "還沒有工具",
    description: "成為第一個在這裡分享工具的人吧！",
    actionLabel: "Open Studio",
    actionHref: "/studio",
  },
  "no-results": {
    icon: Search,
    title: "找不到相關結果",
    description: "試試其他關鍵字，或瀏覽分類",
    actionLabel: "瀏覽市集",
    actionHref: "/marketplace",
  },
  "no-reviews": {
    icon: Star,
    title: "還沒有評論",
    description: "成為第一個評論的人吧！",
  },
  "no-trending": {
    icon: TrendingUp,
    title: "還沒有熱門工具",
    description: "使用更多工具來幫助它們上榜！",
  },
};

export function EmptyState({
  type,
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  const content = defaultContent[type];
  const Icon = content.icon;

  return (
    <div className="text-center py-16">
      <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">{title || content.title}</h3>
      <p className="text-muted-foreground mb-4">
        {description || content.description}
      </p>
      {(actionHref || content.actionHref) && (
        <Button asChild>
          <Link href={actionHref || content.actionHref!}>
            {actionLabel || content.actionLabel}
          </Link>
        </Button>
      )}
    </div>
  );
}
