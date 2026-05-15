"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MarketplaceToolCard } from "@/components/marketplace-tool-card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface Tool {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  visibility: string;
  author: {
    id: string;
    name: string | null;
    image: string | null;
  };
  stats: {
    totalUsage: number;
    averageRating: number;
    totalReviews: number;
  };
}

interface CategoryToolsGridProps {
  initialTools: Tool[];
  initialHasMore: boolean;
  favoriteIds: Set<string>;
  /** Undefined means "All categories" — no category filter on load-more. */
  category?: string;
  /** Translation keys (under `marketplace.empty`) for the empty state. */
  emptyTitleKey: "all" | "categoryTitle";
  emptySubtitleKey?: "categorySubtitle";
}

const PAGE_SIZE = 24;

export function CategoryToolsGrid({
  initialTools,
  initialHasMore,
  favoriteIds,
  category,
  emptyTitleKey,
  emptySubtitleKey,
}: CategoryToolsGridProps) {
  const [tools, setTools] = useState<Tool[]>(initialTools);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const t = useTranslations("marketplace");

  async function loadMore() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        section: "newest",
        limit: String(PAGE_SIZE),
        offset: String(tools.length),
      });
      if (category) params.set("category", category);
      const res = await fetch(`/api/marketplace?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { tools: Tool[]; hasMore: boolean };
      setTools((prev) => [...prev, ...data.tools]);
      setHasMore(data.hasMore);
    } catch {
      toast({
        title: t("pagination.loadFailedTitle"),
        description: t("pagination.loadFailedDescription"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  if (tools.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg mb-2">{t(`empty.${emptyTitleKey}`)}</p>
        {emptySubtitleKey && <p className="text-sm">{t(`empty.${emptySubtitleKey}`)}</p>}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool) => (
          <MarketplaceToolCard
            key={tool.id}
            tool={tool}
            isFavorited={favoriteIds.has(tool.id)}
          />
        ))}
      </div>

      <div className="flex justify-center mt-8">
        {hasMore ? (
          <Button onClick={loadMore} disabled={loading} variant="outline">
            {loading ? t("pagination.loading") : t("pagination.loadMore")}
          </Button>
        ) : (
          <span className="text-sm text-muted-foreground">{t("pagination.endOfList")}</span>
        )}
      </div>
    </>
  );
}
