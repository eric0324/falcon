import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; tableId: string; columnId: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id, tableId, columnId } = await params;

  const column = await prisma.externalDatabaseColumn.findFirst({
    where: {
      id: columnId,
      tableId,
      table: { databaseId: id },
    },
  });

  if (!column) {
    return NextResponse.json({ error: "Column not found" }, { status: 404 });
  }

  const body = await req.json();

  const updated = await prisma.externalDatabaseColumn.update({
    where: { id: columnId },
    data: {
      ...(body.note !== undefined && { note: body.note || null }),
      ...(body.allowedRoleIds !== undefined && {
        allowedRoles: {
          set: body.allowedRoleIds.map((roleId: string) => ({ id: roleId })),
        },
      }),
    },
    select: {
      id: true,
      columnName: true,
      note: true,
      allowedRoles: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updated);
}
