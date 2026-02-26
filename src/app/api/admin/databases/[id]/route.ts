import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { testConnection } from "@/lib/external-db";
import { decrypt } from "@/lib/encryption";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const db = await prisma.externalDatabase.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      type: true,
      host: true,
      port: true,
      database: true,
      username: true,
      sslEnabled: true,
      lastSyncedAt: true,
      createdAt: true,
      updatedAt: true,
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

  if (!db) {
    return NextResponse.json({ error: "Database not found" }, { status: 404 });
  }

  return NextResponse.json(db);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const existing = await prisma.externalDatabase.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Database not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { name, type, host, port, database, username, password, sslEnabled } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (type !== undefined) data.type = type;
    if (host !== undefined) data.host = host;
    if (port !== undefined) data.port = port;
    if (database !== undefined) data.database = database;
    if (username !== undefined) data.username = username;
    if (sslEnabled !== undefined) data.sslEnabled = sslEnabled;
    if (password) data.password = encrypt(password);

    // Test connection with merged config
    const testConfig = {
      type: (data.type ?? existing.type) as "POSTGRESQL" | "MYSQL",
      host: (data.host ?? existing.host) as string,
      port: (data.port ?? existing.port) as number,
      database: (data.database ?? existing.database) as string,
      username: (data.username ?? existing.username) as string,
      password: password || decrypt(existing.password),
      sslEnabled: (data.sslEnabled ?? existing.sslEnabled) as boolean,
    };
    await testConnection(testConfig);

    const updated = await prisma.externalDatabase.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        type: true,
        host: true,
        port: true,
        database: true,
        username: true,
        sslEnabled: true,
        lastSyncedAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新失敗";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const existing = await prisma.externalDatabase.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Database not found" }, { status: 404 });
  }

  await prisma.externalDatabase.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
