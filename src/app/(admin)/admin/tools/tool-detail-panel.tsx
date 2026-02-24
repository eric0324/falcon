"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ToolSummary {
  id: string;
  name: string;
  description: string | null;
  visibility: { text: string; className: string };
  category: string | null;
  tags: string[];
  totalUsage: number;
  rating: number;
  reviewCount: number;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface Review {
  id: string;
  rating: number;
  content: string | null;
  createdAt: string;
  user: { name: string | null; email: string; image: string | null };
  replies: {
    content: string;
    createdAt: string;
    user: { name: string | null };
  }[];
}

interface ToolDetail {
  stats: {
    totalUsage: number;
    weeklyUsage: number;
    trendingScore: number;
  } | null;
  reviews: Review[];
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("zh-TW", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ToolDetailPanel({ tool }: { tool: ToolSummary }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<ToolDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    if (expanded) {
      setExpanded(false);
      return;
    }

    setExpanded(true);

    if (detail) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/tools/${tool.id}`);
      if (res.ok) {
        const data = await res.json();
        setDetail({ stats: data.stats, reviews: data.reviews });
      } else {
        setError(`載入失敗 (${res.status})`);
      }
    } catch {
      setError("載入失敗（網路錯誤）");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <tr
        className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={toggle}
      >
        <td className="p-3">
          <div className="flex items-center gap-2">
            <ChevronRight
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform shrink-0",
                expanded && "rotate-90"
              )}
            />
            <span className="font-medium">{tool.name}</span>
          </div>
        </td>
        <td className="p-3">
          <Link
            href={`/admin/members/${tool.author.id}`}
            className="flex items-center gap-2 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <Avatar className="h-6 w-6">
              {tool.author.image && (
                <AvatarImage
                  src={tool.author.image}
                  alt={tool.author.name || ""}
                />
              )}
              <AvatarFallback className="text-[10px]">
                {tool.author.name?.slice(0, 1).toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">
              {tool.author.name || tool.author.email}
            </span>
          </Link>
        </td>
        <td className="p-3">
          <span
            className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${tool.visibility.className}`}
          >
            {tool.visibility.text}
          </span>
        </td>
        <td className="p-3 text-sm text-muted-foreground">
          {tool.category || "-"}
        </td>
        <td className="p-3 text-right tabular-nums">{tool.totalUsage}</td>
        <td className="p-3 text-right text-sm">
          {tool.rating > 0 ? (
            <span className="tabular-nums">
              {tool.rating.toFixed(1)}{" "}
              <span className="text-muted-foreground">
                ({tool.reviewCount})
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </td>
        <td
          className="p-3 text-right text-muted-foreground text-sm"
          suppressHydrationWarning
        >
          {formatDate(tool.createdAt)}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b last:border-0">
          <td colSpan={7} className="p-4 bg-muted/10">
            {loading ? (
              <p className="text-sm text-muted-foreground py-4">載入中...</p>
            ) : error ? (
              <p className="text-sm text-red-500 py-4">{error}</p>
            ) : detail ? (
              <div className="space-y-4">
                {tool.description && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">描述</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {tool.description}
                    </p>
                  </div>
                )}

                {tool.tags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">標籤</h4>
                    <div className="flex flex-wrap gap-1">
                      {tool.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-block px-2 py-0.5 text-xs rounded bg-muted text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {detail.stats && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">使用統計</h4>
                    <div className="flex gap-6 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          總使用量：
                        </span>
                        <span className="font-medium tabular-nums">
                          {detail.stats.totalUsage}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          本週使用：
                        </span>
                        <span className="font-medium tabular-nums">
                          {detail.stats.weeklyUsage}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          趨勢分數：
                        </span>
                        <span className="font-medium tabular-nums">
                          {detail.stats.trendingScore.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium mb-2">
                    評論 ({detail.reviews.length})
                  </h4>
                  {detail.reviews.length === 0 ? (
                    <p className="text-sm text-muted-foreground">尚無評論</p>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {detail.reviews.map((review) => (
                        <div
                          key={review.id}
                          className="rounded-lg border p-3 text-sm"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Avatar className="h-5 w-5">
                              {review.user.image && (
                                <AvatarImage
                                  src={review.user.image}
                                  alt={review.user.name || ""}
                                />
                              )}
                              <AvatarFallback className="text-[9px]">
                                {review.user.name?.slice(0, 1) ?? "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                              {review.user.name || review.user.email}
                            </span>
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={cn(
                                    "h-3 w-3",
                                    i < review.rating
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-neutral-300"
                                  )}
                                />
                              ))}
                            </div>
                            <span
                              className="text-xs text-muted-foreground ml-auto"
                              suppressHydrationWarning
                            >
                              {formatDate(review.createdAt)}
                            </span>
                          </div>
                          {review.content && (
                            <p className="text-muted-foreground whitespace-pre-wrap">
                              {review.content}
                            </p>
                          )}
                          {review.replies.map((reply, i) => (
                            <div
                              key={i}
                              className="mt-2 ml-4 pl-3 border-l-2 border-muted text-xs text-muted-foreground"
                            >
                              <span className="font-medium text-foreground">
                                {reply.user.name ?? "作者"}
                              </span>
                              ：{reply.content}
                              <span className="ml-2" suppressHydrationWarning>
                                {formatDate(reply.createdAt)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </td>
        </tr>
      )}
    </>
  );
}
