import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Pagination } from "../pagination";
import { SearchInput } from "../search-input";

export const metadata = { title: "成員管理" };

const PAGE_SIZE = 10;

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

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const q = (params.q ?? "").trim();

  const where: Prisma.UserWhereInput = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const [users, totalCount, tokenAggregation] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
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
    prisma.user.count({ where }),
    prisma.tokenUsage.groupBy({
      by: ["userId"],
      where: { userId: { not: null } },
      _sum: { totalTokens: true, costUsd: true },
      _max: { createdAt: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const basePath = q
    ? `/admin/members?q=${encodeURIComponent(q)}`
    : "/admin/members";

  // Build token stats map (only for users on this page)
  const userIds = new Set(users.map((u) => u.id));
  const userStatsMap = new Map<string, { totalTokens: number; estimatedCost: number; lastActive: Date | null }>();

  for (const row of tokenAggregation) {
    if (!row.userId || !userIds.has(row.userId)) continue;
    userStatsMap.set(row.userId, {
      totalTokens: row._sum.totalTokens || 0,
      estimatedCost: row._sum.costUsd || 0,
      lastActive: row._max.createdAt,
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

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">成員管理</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          共 {totalCount} 位成員
        </p>
      </div>

      <div className="mb-4">
        <SearchInput
          basePath="/admin/members"
          initialValue={q}
          placeholder="搜尋姓名、Email"
        />
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full min-w-[600px]">
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

      <Pagination currentPage={currentPage} totalPages={totalPages} basePath={basePath} />
    </div>
  );
}
