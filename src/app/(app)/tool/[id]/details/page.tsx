import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCategoryById } from "@/lib/categories";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import { ArrowLeft, Pencil, Play, Share2 } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { ToolStats } from "@/components/tool-stats";
import { ReviewSection } from "@/components/review-section";

interface ToolDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ToolDetailsPage({ params }: ToolDetailsPageProps) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user?.id) {
    redirect("/login");
  }

  const tool = await prisma.tool.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
          department: true,
        },
      },
      stats: true,
    },
  });

  if (!tool) {
    notFound();
  }

  // Check access based on visibility
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { department: true },
  });

  const canAccess =
    tool.authorId === session.user.id ||
    tool.visibility === "PUBLIC" ||
    tool.visibility === "COMPANY" ||
    (tool.visibility === "DEPARTMENT" &&
      user?.department &&
      tool.author.department === user.department);

  if (!canAccess) {
    notFound();
  }

  const isOwner = tool.authorId === session.user.id;
  const category = tool.category ? getCategoryById(tool.category) : null;

  // Check if current user has already reviewed
  const userReview = await prisma.review.findUnique({
    where: {
      toolId_userId: {
        toolId: id,
        userId: session.user.id,
      },
    },
  });

  const stats = tool.stats || {
    totalUsage: 0,
    weeklyUsage: 0,
    averageRating: 0,
    totalReviews: 0,
  };

  const t = await getTranslations("tool");
  const tCategories = await getTranslations("categories");
  const tCommon = await getTranslations("common");

  return (
    <div className="p-6 max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/marketplace">
              <ArrowLeft className="h-4 w-4 mr-1" />
              {tCommon("backToMarketplace")}
            </Link>
          </Button>
        </div>

        {/* Tool Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{tool.name}</h1>
                {category && (
                  <span className="text-sm bg-muted px-2 py-1 rounded">
                    {category.icon} {tCategories(category.id)}
                  </span>
                )}
              </div>
              {tool.description && (
                <p className="text-muted-foreground">{tool.description}</p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-1" />
                {tCommon("share")}
              </Button>
              {isOwner && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/chat?edit=${tool.id}`}>
                    <Pencil className="h-4 w-4 mr-1" />
                    {tCommon("edit")}
                  </Link>
                </Button>
              )}
              <Button asChild>
                <Link href={`/tool/${tool.id}`}>
                  <Play className="h-4 w-4 mr-1" />
                  {tCommon("useTool")}
                </Link>
              </Button>
            </div>
          </div>

          {/* Tags */}
          {tool.tags.length > 0 && (
            <div className="flex gap-2 mb-4">
              {tool.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-sm bg-blue-50 text-blue-600 px-2 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Author Info */}
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <UserAvatar
              src={tool.author.image}
              name={tool.author.name}
              size="lg"
            />
            <div>
              <p className="font-medium">{tool.author.name || tCommon("anonymous")}</p>
              <p className="text-sm text-muted-foreground">
                {tool.author.department || tCommon("noDepartment")} ·{" "}
                {formatDistanceToNow(new Date(tool.createdAt), {
                  addSuffix: true,
                  locale: zhTW,
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">{t("details.statistics")}</h2>
          <ToolStats
            totalUsage={stats.totalUsage}
            weeklyUsage={stats.weeklyUsage}
            averageRating={stats.averageRating}
            totalReviews={stats.totalReviews}
          />
        </div>

        {/* Reviews Section */}
        {/* TODO: 上線前改回 canReview={!isOwner} */}
        <ReviewSection
          toolId={tool.id}
          toolAuthorId={tool.authorId}
          currentUserId={session.user.id}
          existingReview={userReview}
          canReview={true}
        />
    </div>
  );
}
