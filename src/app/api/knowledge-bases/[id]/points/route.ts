import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getKnowledgeBaseRole, hasMinRole } from "@/lib/knowledge/permissions";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/knowledge-bases/:id/points — list points with pagination + status filter
export async function GET(req: Request, context: RouteContext) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const role = await getKnowledgeBaseRole(id, session.user.id);
  if (!role) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status"); // PENDING | APPROVED | REJECTED
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = parseInt(url.searchParams.get("limit") || "20", 10);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { knowledgeBaseId: id };
  if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status)) {
    where.status = status;
  }

  const [points, total] = await Promise.all([
    prisma.knowledgePoint.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        upload: { select: { fileName: true } },
        reviewer: { select: { name: true } },
      },
    }),
    prisma.knowledgePoint.count({ where }),
  ]);

  return NextResponse.json({
    points,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

// POST /api/knowledge-bases/:id/points — manually add a knowledge point
export async function POST(req: Request, context: RouteContext) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const role = await getKnowledgeBaseRole(id, session.user.id);
  if (!hasMinRole(role, "CONTRIBUTOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { content } = body;

  if (!content || typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const point = await prisma.knowledgePoint.create({
    data: {
      knowledgeBaseId: id,
      content: content.trim(),
      metadata: { source: "manual" },
      status: "PENDING",
    },
  });

  return NextResponse.json(point, { status: 201 });
}
