import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const groups = await prisma.group.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: { select: { users: true } },
    },
  });

  return NextResponse.json(
    groups.map((r) => ({
      id: r.id,
      name: r.name,
      createdAt: r.createdAt,
      userCount: r._count.users,
    }))
  );
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { name } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "群組名稱為必填" }, { status: 400 });
  }

  const existing = await prisma.group.findUnique({
    where: { name: name.trim() },
  });

  if (existing) {
    return NextResponse.json({ error: "群組名稱已存在" }, { status: 409 });
  }

  const group = await prisma.group.create({
    data: { name: name.trim() },
    select: { id: true, name: true, createdAt: true },
  });

  return NextResponse.json(group, { status: 201 });
}
