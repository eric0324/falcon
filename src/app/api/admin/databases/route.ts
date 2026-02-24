import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { testConnection } from "@/lib/external-db";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const pageSize = 10;

  const [databases, totalCount] = await Promise.all([
    prisma.externalDatabase.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
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
        _count: { select: { tables: true } },
      },
    }),
    prisma.externalDatabase.count(),
  ]);

  return NextResponse.json({
    databases: databases.map((db) => ({
      ...db,
      tableCount: db._count.tables,
      _count: undefined,
    })),
    totalCount,
  });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { name, type, host, port, database, username, password, sslEnabled } = body;

    if (!name || !type || !host || !port || !database || !username || !password) {
      return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
    }

    if (!["POSTGRESQL", "MYSQL"].includes(type)) {
      return NextResponse.json({ error: "不支援的資料庫類型" }, { status: 400 });
    }

    // Test connection before saving
    await testConnection({ type, host, port, database, username, password, sslEnabled: sslEnabled ?? false });

    const db = await prisma.externalDatabase.create({
      data: {
        name,
        type,
        host,
        port,
        database,
        username,
        password: encrypt(password),
        sslEnabled: sslEnabled ?? false,
      },
      select: {
        id: true,
        name: true,
        type: true,
        host: true,
        port: true,
        database: true,
        username: true,
        sslEnabled: true,
        createdAt: true,
      },
    });

    return NextResponse.json(db, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "連線失敗";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
