import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Visibility, Prisma } from "@prisma/client";
import { Navbar } from "@/components/navbar";
import { MarketplaceToolCard } from "@/components/marketplace-tool-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, TrendingUp, Star, Eye, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LeaderboardPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function LeaderboardPage({ searchParams }: LeaderboardPageProps) {
  const session = await getServerSession(authOptions);
  const { tab = "trending" } = await searchParams;

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Get user's department
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { department: true },
  });

  const visibilityFilter: Prisma.ToolWhereInput = {
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

  // Fetch different rankings
  const [trendingTools, topRatedTools, mostUsedTools, risingStarsTools] = await Promise.all([
    // 本週熱門
    prisma.tool.findMany({
      where: visibilityFilter,
      include: {
        author: { select: { id: true, name: true, image: true } },
        stats: true,
      },
      orderBy: [{ stats: { weeklyUsage: "desc" } }, { createdAt: "desc" }],
      take: 20,
    }),
    // 最高評價 (至少有 reviews)
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
      take: 20,
    }),
    // 使用最多
    prisma.tool.findMany({
      where: visibilityFilter,
      include: {
        author: { select: { id: true, name: true, image: true } },
        stats: true,
      },
      orderBy: [{ stats: { totalUsage: "desc" } }],
      take: 20,
    }),
    // 新星崛起 (30 天內建立，按 weekly usage)
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
      take: 20,
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

  const renderToolList = (tools: typeof trendingTools, emptyMessage: string) => {
    if (tools.length === 0) {
      return (
        <div className="text-center py-16 text-muted-foreground">
          <p>{emptyMessage}</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool, index) => (
          <div key={tool.id} className="relative">
            {index < 3 && (
              <div className="absolute -top-2 -left-2 z-10 w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                {index + 1}
              </div>
            )}
            <MarketplaceToolCard tool={formatTool(tool)} />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <Navbar user={session?.user} />

      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/marketplace">
              <ArrowLeft className="h-4 w-4 mr-1" />
              返回市集
            </Link>
          </Button>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold mb-6">排行榜</h1>

        {/* Tabs */}
        <Tabs defaultValue={tab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="trending" className="gap-1">
              <TrendingUp className="h-4 w-4" />
              本週熱門
            </TabsTrigger>
            <TabsTrigger value="top-rated" className="gap-1">
              <Star className="h-4 w-4" />
              最高評價
            </TabsTrigger>
            <TabsTrigger value="most-used" className="gap-1">
              <Eye className="h-4 w-4" />
              使用最多
            </TabsTrigger>
            <TabsTrigger value="rising" className="gap-1">
              <Sparkles className="h-4 w-4" />
              新星崛起
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trending">
            {renderToolList(trendingTools, "還沒有熱門工具")}
          </TabsContent>

          <TabsContent value="top-rated">
            {renderToolList(topRatedTools, "還沒有獲得評價的工具")}
          </TabsContent>

          <TabsContent value="most-used">
            {renderToolList(mostUsedTools, "還沒有被使用的工具")}
          </TabsContent>

          <TabsContent value="rising">
            {renderToolList(risingStarsTools, "還沒有新星工具")}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
