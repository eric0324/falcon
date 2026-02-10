import { prisma } from "@/lib/prisma";
import { estimateCost } from "@/lib/ai/models";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatCost(cost: number): string {
  if (cost === 0) return "$0";
  if (cost < 0.01) return "<$0.01";
  return `$${cost.toFixed(2)}`;
}

function formatDate(date: Date | string | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("zh-TW", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.slice(0, 1).toUpperCase();
}

export default async function AdminMembersPage() {
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
        _count: { select: { conversations: true } },
      },
    }),
    prisma.tokenUsage.groupBy({
      by: ["userId", "model"],
      _sum: { inputTokens: true, outputTokens: true, totalTokens: true },
      _max: { createdAt: true },
    }),
  ]);

  const userStatsMap = new Map<string, { totalTokens: number; estimatedCost: number; lastActive: Date | null }>();

  for (const row of tokenAggregation) {
    const prev = userStatsMap.get(row.userId) || { totalTokens: 0, estimatedCost: 0, lastActive: null };
    const inputTokens = row._sum.inputTokens || 0;
    const outputTokens = row._sum.outputTokens || 0;
    const totalTokens = row._sum.totalTokens || 0;
    const cost = estimateCost(row.model, inputTokens, outputTokens);
    const rowLastActive = row._max.createdAt;

    userStatsMap.set(row.userId, {
      totalTokens: prev.totalTokens + totalTokens,
      estimatedCost: prev.estimatedCost + cost,
      lastActive: !prev.lastActive || (rowLastActive && rowLastActive > prev.lastActive) ? rowLastActive : prev.lastActive,
    });
  }

  const members = users
    .map((user) => {
      const stats = userStatsMap.get(user.id);
      return {
        ...user,
        totalTokens: stats?.totalTokens ?? 0,
        estimatedCost: stats?.estimatedCost ?? 0,
        lastActive: stats?.lastActive ?? null,
        conversationCount: user._count.conversations,
      };
    })
    .sort((a, b) => b.totalTokens - a.totalTokens);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">成員管理</h1>
        <p className="text-muted-foreground mt-1">
          共 {members.length} 位成員
        </p>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">成員</th>
              <th className="text-left p-3 font-medium">部門</th>
              <th className="text-right p-3 font-medium">對話數</th>
              <th className="text-right p-3 font-medium">Token 用量</th>
              <th className="text-right p-3 font-medium">預估費用</th>
              <th className="text-right p-3 font-medium">最後活躍</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="p-3">
                  <Link
                    href={`/admin/members/${member.id}`}
                    className="flex items-center gap-3 hover:underline"
                  >
                    <Avatar className="h-8 w-8">
                      {member.image && <AvatarImage src={member.image} alt={member.name || ""} />}
                      <AvatarFallback className="text-xs">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{member.name || member.email}</div>
                      <div className="text-xs text-muted-foreground">{member.email}</div>
                    </div>
                  </Link>
                </td>
                <td className="p-3 text-muted-foreground">
                  {member.department || "-"}
                </td>
                <td className="p-3 text-right tabular-nums">
                  {member.conversationCount}
                </td>
                <td className="p-3 text-right tabular-nums font-medium">
                  {formatTokens(member.totalTokens)}
                </td>
                <td className="p-3 text-right tabular-nums text-sm">
                  {formatCost(member.estimatedCost)}
                </td>
                <td className="p-3 text-right text-muted-foreground text-sm">
                  {formatDate(member.lastActive)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
