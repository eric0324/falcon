import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Visibility, Prisma } from "@prisma/client";
import { Navbar } from "@/components/navbar";
import { MarketplaceToolCard } from "@/components/marketplace-tool-card";
import { SearchBar } from "@/components/search-bar";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const session = await getServerSession(authOptions);
  const { q: query } = await searchParams;

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (!query) {
    redirect("/marketplace");
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

  const tools = await prisma.tool.findMany({
    where: {
      AND: [
        visibilityFilter,
        {
          OR: [
            { name: { contains: query, mode: Prisma.QueryMode.insensitive } },
            { description: { contains: query, mode: Prisma.QueryMode.insensitive } },
            { tags: { has: query } },
          ],
        },
      ],
    },
    include: {
      author: {
        select: { id: true, name: true, image: true },
      },
      stats: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const formatTool = (tool: typeof tools[0]) => ({
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

        {/* Search Bar */}
        <div className="max-w-xl mb-8">
          <SearchBar />
        </div>

        {/* Results Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold">
            搜尋「{query}」的結果
          </h1>
          <p className="text-muted-foreground">
            找到 {tools.length} 個工具
          </p>
        </div>

        {/* Tools Grid */}
        {tools.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools.map((tool) => (
              <MarketplaceToolCard key={tool.id} tool={formatTool(tool)} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg mb-2">找不到相關工具</p>
            <p className="text-sm">試試其他關鍵字，或瀏覽分類</p>
          </div>
        )}
      </main>
    </div>
  );
}
