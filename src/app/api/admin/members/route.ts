import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { estimateCost } from "@/lib/ai/models";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const [users, tokenAggregation] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        department: true,
        role: true,
        createdAt: true,
        _count: { select: { conversations: true } },
      },
    }),
    prisma.tokenUsage.groupBy({
      by: ["userId", "model"],
      _sum: { inputTokens: true, outputTokens: true, totalTokens: true },
      _max: { createdAt: true },
    }),
  ]);

  // Aggregate per user: total tokens, estimated cost, last active
  const userStatsMap = new Map<string, {
    totalTokens: number;
    estimatedCost: number;
    lastActive: Date | null;
  }>();

  for (const row of tokenAggregation) {
    const prev = userStatsMap.get(row.userId) || {
      totalTokens: 0,
      estimatedCost: 0,
      lastActive: null,
    };

    const inputTokens = row._sum.inputTokens || 0;
    const outputTokens = row._sum.outputTokens || 0;
    const totalTokens = row._sum.totalTokens || 0;
    const cost = estimateCost(row.model, inputTokens, outputTokens);
    const rowLastActive = row._max.createdAt;

    userStatsMap.set(row.userId, {
      totalTokens: prev.totalTokens + totalTokens,
      estimatedCost: prev.estimatedCost + cost,
      lastActive:
        !prev.lastActive || (rowLastActive && rowLastActive > prev.lastActive)
          ? rowLastActive
          : prev.lastActive,
    });
  }

  const members = users.map((user) => {
    const stats = userStatsMap.get(user.id);
    return {
      ...user,
      totalTokens: stats?.totalTokens ?? 0,
      estimatedCost: stats?.estimatedCost ?? 0,
      lastActive: stats?.lastActive ?? null,
      conversationCount: user._count.conversations,
    };
  });

  members.sort((a, b) => b.totalTokens - a.totalTokens);

  return NextResponse.json(members);
}
