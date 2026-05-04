import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canUserAccessTool } from "@/lib/tool-visibility";
import { getCategoryById } from "@/lib/categories";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import { ArrowLeft, Pencil, Play, Database } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { ToolStats } from "@/components/tool-stats";
import { ShareButton } from "./share-button";
import { ToolFavoriteButton } from "@/components/tool-favorite-button";
import { ReviewSection } from "@/components/review-section";

interface ToolDetailsPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ToolDetailsPageProps): Promise<Metadata> {
  const { id } = await params;
  const tool = await prisma.tool.findUnique({ where: { id }, select: { name: true } });
  return { title: tool ? `${tool.name} - 詳情` : "工具詳情" };
}

export default async function ToolDetailsPage({ params }: ToolDetailsPageProps) {
  const session = await getSession();
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
  const canAccess = await canUserAccessTool(tool, session.user.id);

  if (!canAccess) {
    notFound();
  }

  const isOwner = tool.authorId === session.user.id;
  const category = tool.category ? getCategoryById(tool.category) : null;

  // Check if current user has already reviewed
  const userReview = await prisma.toolReview.findUnique({
    where: {
      toolId_userId: {
        toolId: id,
        userId: session.user.id,
      },
    },
  });

  // Check if current user has favorited
  const favorite = await prisma.toolFavorite.findUnique({
    where: {
      userId_toolId: { userId: session.user.id, toolId: id },
    },
    select: { id: true },
  });
  const isFavorited = favorite !== null;

  const stats = tool.stats || {
    totalUsage: 0,
    weeklyUsage: 0,
    averageRating: 0,
    totalReviews: 0,
  };

  const t = await getTranslations("tool");
  const tCategories = await getTranslations("categories");
  const tCommon = await getTranslations("common");
  const tDb = await getTranslations("toolDatabase");

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/">
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
            <div className="flex gap-2 shrink-0 items-center">
              <ToolFavoriteButton
                toolId={tool.id}
                initialFavorited={isFavorited}
                size="md"
              />
              <ShareButton toolId={tool.id} visibility={tool.visibility} label={tCommon("share")} />
              <Button variant="outline" size="sm" asChild>
                <a href={`/tool/${tool.id}/data`} target="_blank" rel="noopener noreferrer">
                  <Database className="h-4 w-4 mr-1" />
                  {tDb("viewData")}
                </a>
              </Button>
              {isOwner && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/chat?${tool.conversationId ? `id=${tool.conversationId}&` : ""}edit=${tool.id}`}>
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
          <Link
            href={`/profile/${tool.author.id}`}
            className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
          >
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
          </Link>
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

        {/* Database Tables — only visible to tool owner */}
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
