import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Visibility } from "@prisma/client";
import { TOOL_CATEGORIES, getCategoryById } from "@/lib/categories";
import { MarketplaceToolCard } from "@/components/marketplace-tool-card";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CategoryPageProps {
  params: Promise<{ id: string }>;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const session = await getServerSession(authOptions);
  const { id: categoryId } = await params;

  if (!session?.user?.id) {
    redirect("/login");
  }

  const category = getCategoryById(categoryId);
  if (!category) {
    notFound();
  }

  // Get user's department
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { department: true },
  });

  const tools = await prisma.tool.findMany({
    where: {
      category: categoryId,
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

  const tCategories = await getTranslations("categories");
  const tCommon = await getTranslations("common");

  return (
    <div className="p-6">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/marketplace">
              <ArrowLeft className="h-4 w-4 mr-1" />
              {tCommon("backToMarketplace")}
            </Link>
          </Button>
        </div>

        {/* Category Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{category.icon}</span>
            <h1 className="text-2xl font-bold">{tCategories(category.id)}</h1>
          </div>
          <p className="text-muted-foreground">
            {tools.length} 個工具
          </p>
        </div>

        {/* Other Categories */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {TOOL_CATEGORIES.filter((c) => c.id !== categoryId).map((c) => (
            <Link
              key={c.id}
              href={`/marketplace/category/${c.id}`}
              className="flex items-center gap-1 px-3 py-1.5 border rounded-full text-sm hover:bg-muted whitespace-nowrap"
            >
              <span>{c.icon}</span>
              <span>{tCategories(c.id)}</span>
            </Link>
          ))}
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
            <p className="text-lg mb-2">這個分類還沒有工具</p>
            <p className="text-sm">成為第一個在此分類發布工具的人吧！</p>
          </div>
        )}
    </div>
  );
}
