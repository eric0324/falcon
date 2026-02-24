import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { testConnection } from "@/lib/external-db";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const db = await prisma.externalDatabase.findUnique({ where: { id } });
  if (!db) {
    return NextResponse.json({ error: "Database not found" }, { status: 404 });
  }

  try {
    await testConnection({
      type: db.type,
      host: db.host,
      port: db.port,
      database: db.database,
      username: db.username,
      password: decrypt(db.password),
      sslEnabled: db.sslEnabled,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "連線失敗";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
