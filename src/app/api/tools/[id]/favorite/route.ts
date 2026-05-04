import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { buildVisibilityFilter } from "@/lib/tool-visibility";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/tools/:id/favorite — idempotent
export async function POST(_req: Request, context: RouteContext) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: toolId } = await context.params;
  const userId = session.user.id;

  const tool = await prisma.tool.findFirst({
    where: { id: toolId, ...buildVisibilityFilter(userId) },
    select: { id: true },
  });
  if (!tool) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.toolFavorite.upsert({
    where: { userId_toolId: { userId, toolId } },
    create: { userId, toolId },
    update: {},
  });

  return NextResponse.json({ favorited: true });
}

// DELETE /api/tools/:id/favorite — idempotent
export async function DELETE(_req: Request, context: RouteContext) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: toolId } = await context.params;
  const userId = session.user.id;

  await prisma.toolFavorite.deleteMany({
    where: { userId, toolId },
  });

  return NextResponse.json({ favorited: false });
}
