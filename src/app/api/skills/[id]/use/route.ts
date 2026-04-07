import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// POST /api/skills/[id]/use — 使用次數 +1
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await prisma.skill.update({
    where: { id },
    data: { usageCount: { increment: 1 } },
  });

  return NextResponse.json({ ok: true });
}
