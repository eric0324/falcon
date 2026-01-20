import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/reviews/:reviewId/reply - Author replies to review
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reviewId } = await params;

  try {
    const body = await request.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Reply content is required" },
        { status: 400 }
      );
    }

    // Check review exists and user is the tool author
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        tool: {
          select: { authorId: true },
        },
      },
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    if (review.tool.authorId !== session.user.id) {
      return NextResponse.json(
        { error: "Only tool authors can reply to reviews" },
        { status: 403 }
      );
    }

    // Create reply
    const reply = await prisma.reviewReply.create({
      data: {
        reviewId,
        userId: session.user.id,
        content: content.trim(),
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

    return NextResponse.json(reply);
  } catch (error) {
    console.error("Failed to create reply:", error);
    return NextResponse.json(
      { error: "Failed to create reply" },
      { status: 500 }
    );
  }
}

// DELETE /api/reviews/:reviewId/reply - Delete own reply
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reviewId } = await params;
  const { searchParams } = new URL(request.url);
  const replyId = searchParams.get("replyId");

  if (!replyId) {
    return NextResponse.json({ error: "Reply ID required" }, { status: 400 });
  }

  try {
    const deleted = await prisma.reviewReply.deleteMany({
      where: {
        id: replyId,
        reviewId,
        userId: session.user.id,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Reply not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete reply:", error);
    return NextResponse.json(
      { error: "Failed to delete reply" },
      { status: 500 }
    );
  }
}
