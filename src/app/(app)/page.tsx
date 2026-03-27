import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { buildVisibilityFilter } from "@/lib/tool-visibility";
import { TOOL_CATEGORIES } from "@/lib/categories";
import { MarketplaceToolCard } from "@/components/marketplace-tool-card";
import { SearchBar } from "@/components/search-bar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Star, Eye, Sparkles, Clock, Flame } from "lucide-react";
import { HeroGreeting } from "@/components/hero-greeting";
import { UserAvatar } from "@/components/user-avatar";

export const metadata = { title: "首頁" };

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const visibilityFilter: Prisma.ToolWhereInput = buildVisibilityFilter(session.user.id);

  // Token burning leaderboard — this week's top users
  const startOfWeek = new Date();
  const day = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - (day === 0 ? 6 : day - 1)); // Monday
  startOfWeek.setHours(0, 0, 0, 0);

  const tokenLeaderboard = await prisma.tokenUsage.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: startOfWeek } },
    _sum: { totalTokens: true },
    orderBy: { _sum: { totalTokens: "desc" } },
    take: 10,
  });

  const leaderboardUsers = tokenLeaderboard.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: tokenLeaderboard.map((t) => t.userId) } },
        select: { id: true, name: true, image: true },
      })
    : [];

  const tokenBurners = tokenLeaderboard.map((entry) => {
    const user = leaderboardUsers.find((u) => u.id === entry.userId);
    return {
      name: user?.name || "Anonymous",
      image: user?.image,
      tokens: entry._sum.totalTokens || 0,
    };
  });

  const [trendingTools, topRatedTools, mostUsedTools, risingStarsTools, newestTools] = await Promise.all([
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
        {tools.map((tool) => (
          <MarketplaceToolCard key={tool.id} tool={formatTool(tool)} />
        ))}
      </div>
    );
  };

  const t = await getTranslations("marketplace");
  const tCategories = await getTranslations("categories");
  const tBurners = await getTranslations("tokenBurners");

  return (
    <div className="p-4 sm:p-6">
      {/* Hero Section */}
      <div className="text-center mt-8 sm:mt-16 mb-8">
        <HeroGreeting userName={session.user.name || ""} />
        <p className="text-muted-foreground text-sm sm:text-lg">
          {t("hero.description")}
        </p>
      </div>

      {/* Search */}
      <div className="max-w-xl mx-auto mb-12">
        <SearchBar />
      </div>

      {/* Leaderboard Tabs */}
      <section className="mb-12">
        <Tabs defaultValue="trending" className="w-full">
          <div className="mb-6 overflow-x-auto scrollbar-hide px-4 sm:px-0">
          <TabsList className="flex w-max mx-auto">
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

          <TabsContent value="trending">
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
        </Tabs>
      </section>

      <hr className="border-border mb-12 mx-auto w-1/3" />

      {/* Categories */}
      <section className="mb-12">
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

      {/* Token Burning Leaderboard */}
      {tokenBurners.length > 0 && (
        <section className="mb-12">
          <hr className="border-border mb-12 mx-auto w-1/3" />

          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold flex items-center justify-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                {tBurners("title")}
                <Flame className="h-5 w-5 text-orange-500" />
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {tBurners("subtitle")}
              </p>
            </div>

            <div className="space-y-2 mb-8">
              {tokenBurners.map((burner, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg ${
                    i === 0
                      ? "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800"
                      : i < 3
                      ? "bg-muted/50"
                      : ""
                  }`}
                >
                  <span className={`text-sm font-bold w-6 text-center ${
                    i === 0 ? "text-amber-500" : i < 3 ? "text-muted-foreground" : "text-muted-foreground/60"
                  }`}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                  </span>
                  <UserAvatar src={burner.image} name={burner.name} size="sm" />
                  <span className="font-medium flex-1 truncate">{burner.name}</span>
                  <span className="text-sm text-muted-foreground font-mono">
                    {(burner.tokens / 1000).toFixed(0)}K {tBurners("tokens")}
                  </span>
                </div>
              ))}
            </div>

            <blockquote className="border-l-4 border-orange-300 dark:border-orange-700 pl-4 py-2 space-y-3 text-sm text-muted-foreground italic">
              <p>&ldquo;{tBurners("jensenQuote1")}&rdquo;</p>
              <p>&ldquo;{tBurners("jensenQuote2")}&rdquo;</p>
              <footer className="text-xs not-italic text-muted-foreground/70">
                — {tBurners("jensenSource")}
              </footer>
            </blockquote>
          </div>
        </section>
      )}
    </div>
  );
}
