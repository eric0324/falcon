import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getKnowledgeBaseRole, hasMinRole } from "@/lib/knowledge/permissions";

interface RouteContext {
  params: Promise<{ id: string; pointId: string }>;
}

// PUT /api/knowledge-bases/:id/points/:pointId — edit knowledge point
export async function PUT(req: Request, context: RouteContext) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, pointId } = await context.params;
  const role = await getKnowledgeBaseRole(id, session.user.id);
  if (!hasMinRole(role, "CONTRIBUTOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { content } = body;

  if (!content || typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  // If point was APPROVED, reset to PENDING and clear embedding
  const existing = await prisma.knowledgePoint.findUnique({ where: { id: pointId } });
  if (!existing || existing.knowledgeBaseId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.knowledgePoint.update({
    where: { id: pointId },
    data: {
      content: content.trim(),
      status: existing.status === "APPROVED" ? "PENDING" : existing.status,
      reviewedBy: existing.status === "APPROVED" ? null : existing.reviewedBy,
    },
  });

  // Clear embedding if it was approved (raw SQL since Prisma doesn't handle vector)
  if (existing.status === "APPROVED") {
    await prisma.$executeRawUnsafe(
      `UPDATE "KnowledgePoint" SET embedding = NULL WHERE id = $1`,
      pointId
    );
  }

  return NextResponse.json(updated);
}

// DELETE /api/knowledge-bases/:id/points/:pointId
export async function DELETE(_req: Request, context: RouteContext) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, pointId } = await context.params;
  const role = await getKnowledgeBaseRole(id, session.user.id);
  if (!hasMinRole(role, "CONTRIBUTOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.knowledgePoint.findUnique({ where: { id: pointId } });
  if (!existing || existing.knowledgeBaseId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.knowledgePoint.delete({ where: { id: pointId } });

  return NextResponse.json({ success: true });
}
