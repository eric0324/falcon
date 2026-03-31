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

  // Bulk apply table groups to all columns
  if (body.applyGroupsToAllColumns) {
    const tableWithGroups = await prisma.externalDatabaseTable.findUnique({
      where: { id: tableId },
      select: {
        allowedGroups: { select: { id: true } },
        columns: { select: { id: true } },
      },
    });

    if (!tableWithGroups) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const groupConnect = tableWithGroups.allowedGroups.map((g) => ({ id: g.id }));

    await prisma.$transaction(
      tableWithGroups.columns.map((col) =>
        prisma.externalDatabaseColumn.update({
          where: { id: col.id },
          data: { allowedGroups: { set: groupConnect } },
        })
      )
    );

    const updatedTable = await prisma.externalDatabaseTable.findUnique({
      where: { id: tableId },
      select: {
        id: true,
        tableName: true,
        note: true,
        hidden: true,
        allowedGroups: { select: { id: true, name: true } },
        columns: {
          select: {
            id: true,
            columnName: true,
            dataType: true,
            isNullable: true,
            isPrimaryKey: true,
            note: true,
            allowedGroups: { select: { id: true, name: true } },
          },
          orderBy: { columnName: "asc" },
        },
      },
    });

    return NextResponse.json(updatedTable);
  }

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
