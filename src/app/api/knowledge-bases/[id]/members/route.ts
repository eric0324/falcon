import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getKnowledgeBaseRole, hasMinRole } from "@/lib/knowledge/permissions";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/knowledge-bases/:id/members
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

  const members = await prisma.knowledgeBaseMember.findMany({
    where: { knowledgeBaseId: id },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(members);
}

// POST /api/knowledge-bases/:id/members — add member
export async function POST(req: Request, context: RouteContext) {
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
  const { userId, role: memberRole } = body;

  if (!userId || !["ADMIN", "CONTRIBUTOR", "VIEWER"].includes(memberRole)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const member = await prisma.knowledgeBaseMember.upsert({
    where: { knowledgeBaseId_userId: { knowledgeBaseId: id, userId } },
    create: { knowledgeBaseId: id, userId, role: memberRole },
    update: { role: memberRole },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });

  return NextResponse.json(member, { status: 201 });
}
