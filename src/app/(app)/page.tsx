import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { buildVisibilityFilter } from "@/lib/tool-visibility";
import { TOOL_CATEGORIES } from "@/lib/categories";
import { getFavoriteToolIds, getFavoritedTools } from "@/lib/tool-favorites";
import { MarketplaceToolCard } from "@/components/marketplace-tool-card";
import { MyFavoritesGrid } from "@/components/my-favorites-grid";
import { SearchBar } from "@/components/search-bar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Star, Eye, Sparkles, Clock, Heart } from "lucide-react";
import { HeroGreeting } from "@/components/hero-greeting";
import { MarketplaceTour } from "@/components/onboarding/marketplace-tour";

export const metadata = { title: "首頁" };

export default async function HomePage() {
  const session = await getSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const visibilityFilter: Prisma.ToolWhereInput = buildVisibilityFilter(session.user.id);

  const [
    trendingTools,
    topRatedTools,
    mostUsedTools,
    risingStarsTools,
    newestTools,
    favoriteIds,
    favoritedTools,
  ] = await Promise.all([
    // 本週熱門
    prisma.tool.findMany({
      where: visibilityFilter,
      include: {
        author: { select: { id: true, name: true, image: true } },
        stats: true,
      },
      orderBy: [{ stats: { weeklyUsage: "desc" } }, { createdAt: "desc" }],
      take: 12,
    }),
    // 最高評價
    prisma.tool.findMany({
      where: {
        ...visibilityFilter,
        stats: { totalReviews: { gte: 1 } },
      },
      include: {
        author: { select: { id: true, name: true, image: true } },
        stats: true,
      },
      orderBy: [{ stats: { weightedRating: "desc" } }],
      take: 12,
    }),
    // 使用最多
    prisma.tool.findMany({
      where: visibilityFilter,
      include: {
        author: { select: { id: true, name: true, image: true } },
        stats: true,
      },
      orderBy: [{ stats: { totalUsage: "desc" } }],
      take: 12,
    }),
    // 新星崛起 (30 天內建立)
    prisma.tool.findMany({
      where: {
        ...visibilityFilter,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      include: {
        author: { select: { id: true, name: true, image: true } },
        stats: true,
      },
      orderBy: [{ stats: { weeklyUsage: "desc" } }, { createdAt: "desc" }],
      take: 12,
    }),
    // 最新上架
    prisma.tool.findMany({
      where: visibilityFilter,
      include: {
        author: { select: { id: true, name: true, image: true } },
        stats: true,
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    getFavoriteToolIds(session.user.id),
    getFavoritedTools(session.user.id, { take: 12 }),
  ]);

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

  const renderToolGrid = (tools: typeof trendingTools, emptyMessage: string) => {
    if (tools.length === 0) {
      return (
        <div className="text-center py-16 text-muted-foreground">
          <p>{emptyMessage}</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool, i) => (
          <div key={tool.id} {...(i === 0 ? { "data-tour": "marketplace-tool-card" } : {})}>
            <MarketplaceToolCard
              tool={formatTool(tool)}
              isFavorited={favoriteIds.has(tool.id)}
            />
          </div>
        ))}
      </div>
    );
  };

  const favoritedToolsFormatted = favoritedTools.map((tool) => formatTool(tool));
  const defaultTab = favoritedToolsFormatted.length > 0 ? "favorites" : "trending";

  const t = await getTranslations("marketplace");
  const tCategories = await getTranslations("categories");

  return (
    <MarketplaceTour>
    <div className="p-4 sm:p-6">
      {/* Hero Section */}
      <div data-tour="marketplace-hero" className="text-center mt-8 sm:mt-16 mb-8">
        <HeroGreeting userName={session.user.name || ""} />
        <p className="text-muted-foreground text-sm sm:text-lg">
          {t("hero.description")}
        </p>
      </div>

      {/* Search */}
      <div data-tour="marketplace-search" className="max-w-xl mx-auto mb-12">
        <SearchBar />
      </div>

      {/* Leaderboard Tabs */}
      <section className="mb-12">
        <Tabs defaultValue={defaultTab} className="w-full">
          <div className="mb-6 overflow-x-auto scrollbar-hide px-4 sm:px-0">
          <TabsList className="flex w-max mx-auto">
            <TabsTrigger value="favorites" className="gap-1">
              <Heart className="h-4 w-4" />
              {t("tabs.favorites")}
            </TabsTrigger>
            <TabsTrigger value="trending" className="gap-1">
              <TrendingUp className="h-4 w-4" />
              {t("tabs.trending")}
            </TabsTrigger>
            <TabsTrigger value="top-rated" className="gap-1">
              <Star className="h-4 w-4" />
              {t("tabs.topRated")}
            </TabsTrigger>
            <TabsTrigger value="most-used" className="gap-1">
              <Eye className="h-4 w-4" />
              {t("tabs.mostUsed")}
            </TabsTrigger>
            <TabsTrigger value="rising" className="gap-1">
              <Sparkles className="h-4 w-4" />
              {t("tabs.rising")}
            </TabsTrigger>
            <TabsTrigger value="newest" className="gap-1">
              <Clock className="h-4 w-4" />
              {t("tabs.newest")}
            </TabsTrigger>
          </TabsList>
          </div>

          <TabsContent value="trending" data-tour="marketplace-tool-list">
            {renderToolGrid(trendingTools, t("empty.trending"))}
          </TabsContent>
          <TabsContent value="top-rated">
            {renderToolGrid(topRatedTools, t("empty.topRated"))}
          </TabsContent>
          <TabsContent value="most-used">
            {renderToolGrid(mostUsedTools, t("empty.mostUsed"))}
          </TabsContent>
          <TabsContent value="rising">
            {renderToolGrid(risingStarsTools, t("empty.rising"))}
          </TabsContent>
          <TabsContent value="newest">
            {renderToolGrid(newestTools, t("empty.newest"))}
          </TabsContent>
          <TabsContent value="favorites">
            <MyFavoritesGrid initialTools={favoritedToolsFormatted} />
          </TabsContent>
        </Tabs>
      </section>

      <hr className="border-border mb-12 mx-auto w-1/3" />

      {/* Categories */}
      <section data-tour="marketplace-categories" className="mb-12">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex sm:justify-center gap-3 pb-2">
            {TOOL_CATEGORIES.map((category) => (
              <Link
                key={category.id}
                href={`/marketplace/category/${category.id}`}
                className="flex items-center gap-1.5 border rounded-full px-3 py-1.5 hover:bg-muted/50 hover:border-foreground/20 transition-colors whitespace-nowrap"
              >
                <span className="text-sm">{category.icon}</span>
                <span className="text-xs font-medium">{tCategories(category.id)}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

    </div>
    </MarketplaceTour>
  );
}
