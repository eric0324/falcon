import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { checkQuota, getOrCreateQuota } from "@/lib/quota";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const quota = await checkQuota(id);
  return NextResponse.json(quota);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();
  const { amount } = body;

  if (typeof amount !== "number" || amount <= 0) {
    return NextResponse.json(
      { error: "amount must be a positive number" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const quota = await getOrCreateQuota(id);
  await prisma.userQuota.update({
    where: { id: quota.id },
    data: { bonusBalanceUsd: { increment: amount } },
  });

  const updated = await checkQuota(id);
  return NextResponse.json(updated);
}
