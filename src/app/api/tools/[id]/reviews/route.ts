import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/tools/:id/reviews - Get reviews for a tool
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: toolId } = await params;
  const { searchParams } = new URL(request.url);
  const sort = searchParams.get("sort") || "newest";

  try {
    const reviews = await prisma.review.findMany({
      where: { toolId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy:
        sort === "rating"
          ? { rating: "desc" }
          : { createdAt: "desc" },
    });

    return NextResponse.json(reviews);
  } catch (error) {
    console.error("Failed to fetch reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

// POST /api/tools/:id/reviews - Create or update review
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: toolId } = await params;

  try {
    const body = await request.json();
    const { rating, content } = body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Check tool exists and user is not the author
    const tool = await prisma.tool.findUnique({
      where: { id: toolId },
      select: { id: true, authorId: true },
    });

    if (!tool) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    // TODO: 上線前恢復此檢查
    // if (tool.authorId === session.user.id) {
    //   return NextResponse.json(
    //     { error: "Cannot review your own tool" },
    //     { status: 400 }
    //   );
    // }

    // Upsert review (one per user per tool)
    const review = await prisma.review.upsert({
      where: {
        toolId_userId: {
          toolId,
          userId: session.user.id,
        },
      },
      create: {
        toolId,
        userId: session.user.id,
        rating,
        content: content || null,
      },
      update: {
        rating,
        content: content || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // Update tool stats
    const stats = await prisma.review.aggregate({
      where: { toolId },
      _avg: { rating: true },
      _count: true,
    });

    const avgRating = stats._avg.rating || 0;
    const totalReviews = stats._count;

    // IMDB weighted rating formula: (v/(v+m)) * R + (m/(v+m)) * C
    // v = number of votes, m = minimum votes (10), R = average rating, C = mean across all (3.0)
    const m = 10;
    const C = 3.0;
    const weightedRating =
      (totalReviews / (totalReviews + m)) * avgRating +
      (m / (totalReviews + m)) * C;

    await prisma.toolStats.upsert({
      where: { toolId },
      create: {
        toolId,
        totalReviews,
        averageRating: avgRating,
        weightedRating,
      },
      update: {
        totalReviews,
        averageRating: avgRating,
        weightedRating,
      },
    });

    return NextResponse.json(review);
  } catch (error) {
    console.error("Failed to create review:", error);
    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 }
    );
  }
}

// DELETE /api/tools/:id/reviews - Delete user's own review
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: toolId } = await params;

  try {
    const deleted = await prisma.review.deleteMany({
      where: {
        toolId,
        userId: session.user.id,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    // Update tool stats
    const stats = await prisma.review.aggregate({
      where: { toolId },
      _avg: { rating: true },
      _count: true,
    });

    const avgRating = stats._avg.rating || 0;
    const totalReviews = stats._count;
    const m = 10;
    const C = 3.0;
    const weightedRating =
      totalReviews > 0
        ? (totalReviews / (totalReviews + m)) * avgRating +
          (m / (totalReviews + m)) * C
        : 0;

    await prisma.toolStats.update({
      where: { toolId },
      data: {
        totalReviews,
        averageRating: avgRating,
        weightedRating,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete review:", error);
    return NextResponse.json(
      { error: "Failed to delete review" },
      { status: 500 }
    );
  }
}
