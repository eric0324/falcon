import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { estimateCost } from "@/lib/ai/models";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, image: true, department: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const conversations = await prisma.conversation.findMany({
    where: { userId: id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      model: true,
      updatedAt: true,
      createdAt: true,
      deletedAt: true,
      _count: { select: { conversationMessages: true } },
      conversationMessages: {
        where: { role: "assistant" },
        select: { tokenUsages: true },
      },
    },
  });

  const result = conversations.map((conv) => {
    let totalTokens = 0;
    let estimatedCost = 0;
    for (const msg of conv.conversationMessages) {
      for (const usage of msg.tokenUsages) {
        const input = usage.inputTokens || 0;
        const output = usage.outputTokens || 0;
        totalTokens += input + output;
        estimatedCost += estimateCost(usage.model, input, output);
      }
    }
    return {
      id: conv.id,
      title: conv.title,
      messageCount: conv._count.conversationMessages,
      model: conv.model,
      totalTokens,
      estimatedCost,
      updatedAt: conv.updatedAt,
      createdAt: conv.createdAt,
      deletedAt: conv.deletedAt,
    };
  });

  return NextResponse.json({ user, conversations: result });
}
