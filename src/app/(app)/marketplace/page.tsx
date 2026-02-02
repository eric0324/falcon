import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Visibility } from "@prisma/client";
import { TOOL_CATEGORIES } from "@/lib/categories";
import { MarketplaceToolCard } from "@/components/marketplace-tool-card";
import { SearchBar } from "@/components/search-bar";
import { TrendingUp, Clock, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function MarketplacePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Get user's department for visibility filtering
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { department: true },
  });

  const visibilityFilter = {
    OR: [
      { visibility: Visibility.PUBLIC },
      { visibility: Visibility.COMPANY },
      ...(user?.department
        ? [
            {
              visibility: Visibility.DEPARTMENT,
              author: { department: user.department },
            },
          ]
        : []),
    ],
  };

  // Fetch trending tools (by weekly usage)
  const trendingTools = await prisma.tool.findMany({
    where: visibilityFilter,
    include: {
      author: {
        select: { id: true, name: true, image: true },
      },
      stats: true,
    },
    orderBy: [
      { stats: { weeklyUsage: "desc" } },
      { createdAt: "desc" },
    ],
    take: 6,
  });

  // Fetch newest tools
  const newestTools = await prisma.tool.findMany({
    where: visibilityFilter,
    include: {
      author: {
        select: { id: true, name: true, image: true },
      },
      stats: true,
    },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  const formatTool = (tool: typeof trendingTools[0]) => ({
    id: tool.id,
    name: tool.name,
    description: tool.description,
    category: tool.category,
    tags: tool.tags,
    visibility: tool.visibility,
    author: tool.author,
    stats: tool.stats || {
      totalUsage: 0,
      averageRating: 0,
      totalReviews: 0,
    },
  });

  return (
    <div className="p-6">
      {/* Hero Section */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">工具市集</h1>
        <p className="text-muted-foreground">
          探索同事們創建的實用工具，或分享你的作品
        </p>
      </div>

      {/* Search */}
      <div className="max-w-xl mx-auto mb-12">
        <SearchBar />
      </div>

      {/* Categories & Leaderboard */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">分類瀏覽</h2>
          <Button variant="outline" size="sm" asChild>
            <Link href="/marketplace/leaderboard" className="gap-1.5">
              <Trophy className="h-4 w-4 text-yellow-500" />
              排行榜
            </Link>
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {TOOL_CATEGORIES.map((category) => (
            <Link
              key={category.id}
              href={`/marketplace/category/${category.id}`}
              className="flex items-center gap-1.5 px-3 py-2 border rounded-lg hover:bg-muted/50 transition-colors whitespace-nowrap"
            >
              <span className="text-lg">{category.icon}</span>
              <span className="text-sm">{category.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Trending */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-semibold">本週熱門</h2>
          </div>
          <Link
            href="/marketplace/leaderboard?tab=trending"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            查看更多
          </Link>
        </div>
        {trendingTools.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trendingTools.map((tool) => (
              <MarketplaceToolCard key={tool.id} tool={formatTool(tool)} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            還沒有熱門工具，成為第一個分享工具的人吧！
          </div>
        )}
      </section>

      {/* Newest */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold">最新上架</h2>
          </div>
          <Link
            href="/marketplace?section=newest"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            查看更多
          </Link>
        </div>
        {newestTools.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {newestTools.map((tool) => (
              <MarketplaceToolCard key={tool.id} tool={formatTool(tool)} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            還沒有工具，快去建立一個吧！
          </div>
        )}
      </section>
    </div>
  );
}
