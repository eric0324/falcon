import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();
  const { name } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "角色名稱為必填" }, { status: 400 });
  }

  const existing = await prisma.companyRole.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "角色不存在" }, { status: 404 });
  }

  const duplicate = await prisma.companyRole.findFirst({
    where: { name: name.trim(), id: { not: id } },
  });
  if (duplicate) {
    return NextResponse.json({ error: "角色名稱已存在" }, { status: 409 });
  }

  const updated = await prisma.companyRole.update({
    where: { id },
    data: { name: name.trim() },
    select: { id: true, name: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const existing = await prisma.companyRole.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "角色不存在" }, { status: 404 });
  }

  await prisma.companyRole.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
