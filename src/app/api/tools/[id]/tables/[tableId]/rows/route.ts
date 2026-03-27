import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canUserAccessTool } from "@/lib/tool-visibility";
import { normalizeRow, type ColumnDef } from "@/lib/bridge/tooldb-handler";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; tableId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: toolId, tableId } = await params;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tool = await prisma.tool.findUnique({
    where: { id: toolId },
    select: { id: true, authorId: true, visibility: true, status: true },
  });
  if (!tool) {
    return NextResponse.json({ error: "Tool not found" }, { status: 404 });
  }
  const canAccess = await canUserAccessTool(tool, user.id);
  if (!canAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const table = await prisma.toolTable.findUnique({ where: { id: tableId } });
  if (!table || table.toolId !== toolId) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = 20;

  const [rows, total] = await Promise.all([
    prisma.toolRow.findMany({
      where: { tableId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.toolRow.count({ where: { tableId } }),
  ]);

  const columns = table.columns as unknown as ColumnDef[];

  return NextResponse.json({
    rows: rows.map((r) => ({
      id: r.id,
      data: normalizeRow(r.data as Record<string, unknown>, columns),
      createdBy: r.createdBy,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
