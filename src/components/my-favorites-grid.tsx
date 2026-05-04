"use client";

import { useState } from "react";
import Link from "next/link";
import { MarketplaceToolCard } from "@/components/marketplace-tool-card";

interface FavoriteTool {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  visibility: string;
  author: { id: string; name: string | null; image: string | null };
  stats: { totalUsage: number; averageRating: number; totalReviews: number };
}

interface MyFavoritesGridProps {
  initialTools: FavoriteTool[];
}

export function MyFavoritesGrid({ initialTools }: MyFavoritesGridProps) {
  const [tools, setTools] = useState(initialTools);

  if (tools.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg mb-2">還沒有收藏任何工具</p>
        <p className="text-sm mb-4">在工具卡片上點愛心，就能快速回來找到</p>
        <Link
          href="/"
          className="text-sm underline hover:text-foreground transition-colors"
        >
          去探索看看 →
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {tools.map((tool) => (
        <MarketplaceToolCard
          key={tool.id}
          tool={tool}
          isFavorited={true}
          onFavoriteChange={(favorited) => {
            if (!favorited) {
              setTools((current) => current.filter((t) => t.id !== tool.id));
            }
          }}
        />
      ))}
    </div>
  );
}
