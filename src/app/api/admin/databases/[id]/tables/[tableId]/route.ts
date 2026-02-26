import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; tableId: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id, tableId } = await params;

  const table = await prisma.externalDatabaseTable.findFirst({
    where: { id: tableId, databaseId: id },
  });

  if (!table) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }

  const body = await req.json();

  const updated = await prisma.externalDatabaseTable.update({
    where: { id: tableId },
    data: {
      ...(body.note !== undefined && { note: body.note || null }),
      ...(body.hidden !== undefined && { hidden: body.hidden }),
      ...(body.allowedRoleIds !== undefined && {
        allowedGroups: {
          set: body.allowedRoleIds.map((roleId: string) => ({ id: roleId })),
        },
      }),
    },
    select: {
      id: true,
      tableName: true,
      note: true,
      hidden: true,
      allowedGroups: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updated);
}
