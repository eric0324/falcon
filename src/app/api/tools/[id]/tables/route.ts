import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isPlatformAdmin } from "@/lib/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: toolId } = await params;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tool = await prisma.tool.findUnique({
    where: { id: toolId },
    select: { id: true, authorId: true },
  });
  if (!tool) {
    return NextResponse.json({ error: "Tool not found" }, { status: 404 });
  }
  const isOwner = tool.authorId === user.id;
  const canView = isOwner || (await isPlatformAdmin(user.id));
  if (!canView) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tables = await prisma.toolTable.findMany({
    where: { toolId },
    include: { _count: { select: { rows: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    tables: tables.map((t) => ({
      id: t.id,
      name: t.name,
      columns: t.columns,
      rowCount: t._count.rows,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
  });
}
