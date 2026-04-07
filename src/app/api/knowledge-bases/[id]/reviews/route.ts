import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getKnowledgeBaseRole } from "@/lib/knowledge/permissions";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/knowledge-bases/:id/reviews
export async function GET(_req: Request, context: RouteContext) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const reviews = await prisma.knowledgeBaseReview.findMany({
    where: { knowledgeBaseId: id },
    include: { user: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(reviews);
}

// POST /api/knowledge-bases/:id/reviews — create or update review
export async function POST(req: Request, context: RouteContext) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const userId = session.user.id;

  // Check permission: need VIEWER or above
  const role = await getKnowledgeBaseRole(id, userId);
  if (!role) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Creator cannot review their own knowledge base
  const kb = await prisma.knowledgeBase.findUnique({
    where: { id },
    select: { createdBy: true },
  });
  if (kb?.createdBy === userId) {
    return NextResponse.json({ error: "Cannot review your own knowledge base" }, { status: 403 });
  }

  const body = await req.json();
  const { rating, content } = body;

  if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
  }

  const review = await prisma.knowledgeBaseReview.upsert({
    where: { knowledgeBaseId_userId: { knowledgeBaseId: id, userId } },
    create: {
      knowledgeBaseId: id,
      userId,
      rating: Math.round(rating),
      content: content?.trim() || null,
    },
    update: {
      rating: Math.round(rating),
      content: content?.trim() || null,
    },
    include: { user: { select: { id: true, name: true, image: true } } },
  });

  return NextResponse.json(review, { status: 201 });
}

// DELETE /api/knowledge-bases/:id/reviews — delete own review
export async function DELETE(_req: Request, context: RouteContext) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.knowledgeBaseReview.findUnique({
    where: { knowledgeBaseId_userId: { knowledgeBaseId: id, userId: session.user.id } },
  });

  if (!existing) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  await prisma.knowledgeBaseReview.delete({ where: { id: existing.id } });

  return NextResponse.json({ success: true });
}
