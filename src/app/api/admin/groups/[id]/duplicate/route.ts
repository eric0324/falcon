import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const created = await prisma.$transaction(async (tx) => {
    const source = await tx.group.findUnique({
      where: { id },
      select: {
        name: true,
        tables: { select: { id: true } },
        columns: { select: { id: true } },
      },
    });

    if (!source) return null;

    const prefix = `${source.name} (副本`;
    const existing = await tx.group.findMany({
      where: { name: { startsWith: prefix } },
      select: { name: true },
    });
    const taken = new Set(existing.map((g) => g.name));

    let newName = `${source.name} (副本)`;
    if (taken.has(newName)) {
      let n = 2;
      while (taken.has(`${source.name} (副本 ${n})`)) {
        n++;
      }
      newName = `${source.name} (副本 ${n})`;
    }

    return tx.group.create({
      data: {
        name: newName,
        tables: { connect: source.tables.map((t) => ({ id: t.id })) },
        columns: { connect: source.columns.map((c) => ({ id: c.id })) },
      },
      select: { id: true, name: true, createdAt: true },
    });
  });

  if (!created) {
    return NextResponse.json({ error: "群組不存在" }, { status: 404 });
  }

  return NextResponse.json({ ...created, userCount: 0 }, { status: 201 });
}
