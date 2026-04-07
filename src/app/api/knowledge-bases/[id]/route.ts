import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getKnowledgeBaseRole, hasMinRole } from "@/lib/knowledge/permissions";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/knowledge-bases/:id — knowledge base detail
export async function GET(_req: Request, context: RouteContext) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const role = await getKnowledgeBaseRole(id, session.user.id);
  if (!role) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const kb = await prisma.knowledgeBase.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true, image: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { points: true, uploads: true } },
      reviews: {
        include: { user: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!kb) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ratings = kb.reviews.map((r) => r.rating);
  const avgRating = ratings.length > 0
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : 0;

  return NextResponse.json({
    ...kb,
    userRole: role,
    averageRating: Math.round(avgRating * 10) / 10,
    reviewCount: ratings.length,
  });
}

// PUT /api/knowledge-bases/:id — update knowledge base
export async function PUT(req: Request, context: RouteContext) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const role = await getKnowledgeBaseRole(id, session.user.id);
  if (!hasMinRole(role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) data.name = body.name.trim();
  if (body.description !== undefined) data.description = body.description?.trim() || null;
  if (body.systemPrompt !== undefined) data.systemPrompt = body.systemPrompt?.trim() || null;

  const updated = await prisma.knowledgeBase.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}

// DELETE /api/knowledge-bases/:id — delete knowledge base
export async function DELETE(_req: Request, context: RouteContext) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const role = await getKnowledgeBaseRole(id, session.user.id);
  if (!hasMinRole(role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.knowledgeBase.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
