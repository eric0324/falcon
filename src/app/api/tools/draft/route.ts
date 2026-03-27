import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code, conversationId } = await req.json();

  if (!code || !conversationId) {
    return NextResponse.json(
      { error: "code and conversationId are required" },
      { status: 400 }
    );
  }

  // If a tool already exists for this conversation, update its code
  const existing = await prisma.tool.findUnique({
    where: { conversationId },
    select: { id: true, status: true },
  });

  if (existing) {
    const updated = await prisma.tool.update({
      where: { id: existing.id },
      data: { code },
      select: { id: true, status: true },
    });
    return NextResponse.json({ toolId: updated.id, status: updated.status });
  }

  // Create a new draft tool
  const tool = await prisma.tool.create({
    data: {
      name: "未命名工具",
      code,
      status: "DRAFT",
      authorId: session.user.id,
      conversationId,
    },
    select: { id: true, status: true },
  });

  return NextResponse.json({ toolId: tool.id, status: tool.status });
}
