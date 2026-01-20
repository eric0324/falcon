"use client";

import Link from "next/link";
import { Eye, Star } from "lucide-react";
import { getCategoryById } from "@/lib/categories";
import { UserAvatar } from "@/components/user-avatar";

interface MarketplaceToolCardProps {
  tool: {
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
  };
}

export function MarketplaceToolCard({ tool }: MarketplaceToolCardProps) {
  const category = tool.category ? getCategoryById(tool.category) : null;

  return (
    <Link href={`/tool/${tool.id}/details`}>
      <div className="border rounded-lg p-4 hover:shadow-md transition-shadow h-full flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold line-clamp-1">{tool.name}</h3>
          {category && (
            <span className="text-xs bg-muted px-2 py-0.5 rounded shrink-0">
              {category.icon} {category.name}
            </span>
          )}
        </div>

        {tool.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">
            {tool.description}
          </p>
        )}

        {tool.tags.length > 0 && (
          <div className="flex items-center gap-1 mb-3 flex-wrap">
            {tool.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
            {tool.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{tool.tags.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-auto pt-3 border-t">
          <div className="flex items-center gap-2">
            <UserAvatar
              src={tool.author.image}
              name={tool.author.name}
              size="sm"
            />
            <span className="text-sm text-muted-foreground truncate max-w-[100px]">
              {tool.author.name || "匿名"}
            </span>
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {tool.stats.totalUsage}
            </span>
            {tool.stats.averageRating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                {tool.stats.averageRating.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
