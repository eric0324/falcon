import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { applyCodeUpdate } from "@/lib/tool-snapshot";

export async function POST(req: Request) {
  const session = await getSession();
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
    await applyCodeUpdate(existing.id, code, "草稿自動儲存");
    return NextResponse.json({ toolId: existing.id, status: existing.status });
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
