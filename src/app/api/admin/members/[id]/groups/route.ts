import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await req.json();
  const { roleIds } = body;

  if (!Array.isArray(roleIds)) {
    return NextResponse.json({ error: "roleIds must be an array" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id },
    data: {
      groups: {
        set: roleIds.map((roleId: string) => ({ id: roleId })),
      },
    },
  });

  const updated = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      groups: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updated);
}
