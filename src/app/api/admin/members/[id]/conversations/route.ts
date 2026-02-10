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

  const [conversations, tokenAggregation] = await Promise.all([
    prisma.conversation.findMany({
      where: { userId: id, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        messages: true,
        model: true,
        updatedAt: true,
        createdAt: true,
      },
    }),
    prisma.tokenUsage.groupBy({
      by: ["conversationId", "model"],
      where: { userId: id, conversationId: { not: null } },
      _sum: { inputTokens: true, outputTokens: true, totalTokens: true },
    }),
  ]);

  // Aggregate per conversation: total tokens + estimated cost
  const convStatsMap = new Map<string, { totalTokens: number; estimatedCost: number }>();

  for (const row of tokenAggregation) {
    const convId = row.conversationId!;
    const prev = convStatsMap.get(convId) || { totalTokens: 0, estimatedCost: 0 };
    const inputTokens = row._sum.inputTokens || 0;
    const outputTokens = row._sum.outputTokens || 0;
    const totalTokens = row._sum.totalTokens || 0;
    const cost = estimateCost(row.model, inputTokens, outputTokens);

    convStatsMap.set(convId, {
      totalTokens: prev.totalTokens + totalTokens,
      estimatedCost: prev.estimatedCost + cost,
    });
  }

  const result = conversations.map((conv) => {
    const stats = convStatsMap.get(conv.id);
    return {
      id: conv.id,
      title: conv.title,
      messageCount: Array.isArray(conv.messages) ? conv.messages.length : 0,
      model: conv.model,
      totalTokens: stats?.totalTokens ?? 0,
      estimatedCost: stats?.estimatedCost ?? 0,
      updatedAt: conv.updatedAt,
      createdAt: conv.createdAt,
    };
  });

  return NextResponse.json({ user, conversations: result });
}
