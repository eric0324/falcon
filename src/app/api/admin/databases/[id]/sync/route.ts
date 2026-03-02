import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { introspectSchema } from "@/lib/external-db";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const db = await prisma.externalDatabase.findUnique({
    where: { id },
    include: { tables: { include: { columns: true } } },
  });

  if (!db) {
    return NextResponse.json({ error: "Database not found" }, { status: 404 });
  }

  try {
    const config = {
      type: db.type,
      host: db.host,
      port: db.port,
      database: db.database,
      username: db.username,
      password: decrypt(db.password),
      sslEnabled: db.sslEnabled,
    };

    const schema = await introspectSchema(config);

    // Build existing table map to preserve notes/hidden
    const existingTableMap = new Map(
      db.tables.map((t) => [t.tableName, t])
    );

    // Track which tables were found in introspection
    const foundTableNames = new Set(schema.map((t) => t.tableName));

    // Get all existing roles for connecting to new tables/columns
    const allGroups = await prisma.group.findMany({ select: { id: true } });
    const connectAllGroups = allGroups.map((r) => ({ id: r.id }));

    await prisma.$transaction(async (tx) => {
      // Delete tables that no longer exist
      const tablesToDelete = db.tables
        .filter((t) => !foundTableNames.has(t.tableName))
        .map((t) => t.id);

      if (tablesToDelete.length > 0) {
        await tx.externalDatabaseTable.deleteMany({
          where: { id: { in: tablesToDelete } },
        });
      }

      // Upsert tables and columns
      for (const table of schema) {
        const existingTable = existingTableMap.get(table.tableName);
        const isNewTable = !existingTable;

        const upsertedTable = await tx.externalDatabaseTable.upsert({
          where: {
            databaseId_tableName: {
              databaseId: id,
              tableName: table.tableName,
            },
          },
          create: {
            databaseId: id,
            tableName: table.tableName,
            allowedGroups: { connect: connectAllGroups },
          },
          update: {},
        });

        // Build existing column map
        const existingColumns = existingTable
          ? new Map(existingTable.columns.map((c) => [c.columnName, c]))
          : new Map();

        const foundColumnNames = new Set(table.columns.map((c) => c.columnName));

        // Delete columns that no longer exist
        const columnsToDelete = Array.from(existingColumns.entries())
          .filter(([name]) => !foundColumnNames.has(name))
          .map(([, col]) => col.id);

        if (columnsToDelete.length > 0) {
          await tx.externalDatabaseColumn.deleteMany({
            where: { id: { in: columnsToDelete } },
          });
        }

        // Upsert columns
        for (const col of table.columns) {
          await tx.externalDatabaseColumn.upsert({
            where: {
              tableId_columnName: {
                tableId: upsertedTable.id,
                columnName: col.columnName,
              },
            },
            create: {
              tableId: upsertedTable.id,
              columnName: col.columnName,
              dataType: col.dataType,
              isNullable: col.isNullable,
              isPrimaryKey: col.isPrimaryKey,
              allowedGroups: { connect: connectAllGroups },
            },
            update: {
              dataType: col.dataType,
              isNullable: col.isNullable,
              isPrimaryKey: col.isPrimaryKey,
            },
          });
        }
      }

      // Update lastSyncedAt
      await tx.externalDatabase.update({
        where: { id },
        data: { lastSyncedAt: new Date() },
      });
    });

    // Return fresh data
    const updated = await prisma.externalDatabase.findUnique({
      where: { id },
      select: {
        id: true,
        lastSyncedAt: true,
        tables: {
          orderBy: { tableName: "asc" },
          select: {
            id: true,
            tableName: true,
            note: true,
            hidden: true,
            allowedGroups: { select: { id: true, name: true } },
            columns: {
              orderBy: { columnName: "asc" },
              select: {
                id: true,
                columnName: true,
                dataType: true,
                isNullable: true,
                isPrimaryKey: true,
                note: true,
                allowedGroups: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "掃描失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
