import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { estimateCost } from "@/lib/ai/models";
import Link from "next/link";
import { Star, Wrench, Trash2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Pagination } from "../pagination";
import { SearchInput } from "../search-input";
import { ConversationFilters } from "./conversation-filters";

export const metadata = { title: "對話管理" };

const PAGE_SIZE = 20;

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

function formatDate(date: Date | null | undefined): string {
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

export default async function AdminConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    starred?: string;
    userId?: string;
    model?: string;
    deleted?: string;
  }>;
}) {
  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const q = (params.q ?? "").trim();
  const starredFilter = params.starred;
  const userFilter = params.userId || undefined;
  const modelFilter = params.model || undefined;
  const deletedFilter = params.deleted;

  const where: Prisma.ConversationWhereInput = {};
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
    ];
  }
  if (starredFilter === "true") where.starred = true;
  if (starredFilter === "false") where.starred = false;
  if (userFilter) where.userId = userFilter;
  if (modelFilter) where.model = modelFilter;
  if (deletedFilter === "hide") where.deletedAt = null;
  if (deletedFilter === "only") where.deletedAt = { not: null };

  const [conversations, totalCount, users, modelRows] = await Promise.all([
    prisma.conversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        model: true,
        starred: true,
        deletedAt: true,
        updatedAt: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, image: true } },
        tool: { select: { id: true, name: true } },
        _count: { select: { conversationMessages: true } },
      },
    }),
    prisma.conversation.count({ where }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.conversation.findMany({
      where: { model: { not: null } },
      distinct: ["model"],
      select: { model: true },
    }),
  ]);

  const conversationIds = conversations.map((c) => c.id);
  const usageRows = conversationIds.length
    ? await prisma.tokenUsage.findMany({
        where: {
          conversationMessage: { conversationId: { in: conversationIds } },
        },
        select: {
          model: true,
          inputTokens: true,
          outputTokens: true,
          totalTokens: true,
          conversationMessage: { select: { conversationId: true } },
        },
      })
    : [];

  const statsByConv = new Map<string, { tokens: number; cost: number }>();
  for (const row of usageRows) {
    const convId = row.conversationMessage?.conversationId;
    if (!convId) continue;
    const prev = statsByConv.get(convId) || { tokens: 0, cost: 0 };
    const input = row.inputTokens || 0;
    const output = row.outputTokens || 0;
    prev.tokens += (row.totalTokens || input + output) || 0;
    prev.cost += estimateCost(row.model, input, output);
    statsByConv.set(convId, prev);
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const models = modelRows.map((r) => r.model!).filter(Boolean);

  const filterParams = new URLSearchParams();
  if (q) filterParams.set("q", q);
  if (starredFilter) filterParams.set("starred", starredFilter);
  if (userFilter) filterParams.set("userId", userFilter);
  if (modelFilter) filterParams.set("model", modelFilter);
  if (deletedFilter) filterParams.set("deleted", deletedFilter);
  const qs = filterParams.toString();
  const basePath = `/admin/conversations${qs ? `?${qs}` : ""}`;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">對話管理</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          共 {totalCount} 筆對話
        </p>
      </div>

      <div className="mb-4">
        <SearchInput
          basePath="/admin/conversations"
          initialValue={q}
          extraParams={{
            starred: starredFilter,
            userId: userFilter,
            model: modelFilter,
            deleted: deletedFilter,
          }}
          placeholder="搜尋標題、使用者"
        />
      </div>

      <ConversationFilters
        users={users}
        models={models}
        current={{
          q,
          starred: starredFilter,
          userId: userFilter,
          model: modelFilter,
          deleted: deletedFilter,
        }}
      />

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">標題</th>
              <th className="text-left p-3 font-medium">使用者</th>
              <th className="text-left p-3 font-medium">模型</th>
              <th className="text-right p-3 font-medium">訊息數</th>
              <th className="text-right p-3 font-medium">Token</th>
              <th className="text-right p-3 font-medium">費用</th>
              <th className="text-left p-3 font-medium">演變為工具</th>
              <th className="text-right p-3 font-medium">最後活躍</th>
            </tr>
          </thead>
          <tbody>
            {conversations.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                  沒有符合條件的對話
                </td>
              </tr>
            ) : (
              conversations.map((conv) => {
                const stats = statsByConv.get(conv.id) || { tokens: 0, cost: 0 };
                return (
                  <tr
                    key={conv.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-3">
                      <Link
                        href={`/admin/conversations/${conv.id}`}
                        className="flex items-center gap-2 hover:underline"
                      >
                        {conv.starred && (
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 shrink-0" />
                        )}
                        <span className="font-medium max-w-[280px] truncate">
                          {conv.title || "(未命名對話)"}
                        </span>
                        {conv.deletedAt && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700 shrink-0">
                            <Trash2 className="h-3 w-3" />
                            已刪除
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="p-3">
                      <Link
                        href={`/admin/members/${conv.user.id}`}
                        className="flex items-center gap-2 hover:underline"
                      >
                        <Avatar className="h-6 w-6">
                          {conv.user.image && (
                            <AvatarImage src={conv.user.image} alt={conv.user.name || ""} />
                          )}
                          <AvatarFallback className="text-xs">
                            {getInitials(conv.user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {conv.user.name || conv.user.email}
                        </span>
                      </Link>
                    </td>
                    <td className="p-3 text-muted-foreground text-sm">
                      {conv.model || "-"}
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      {conv._count.conversationMessages}
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      {formatTokens(stats.tokens)}
                    </td>
                    <td className="p-3 text-right tabular-nums text-sm">
                      {formatCost(stats.cost)}
                    </td>
                    <td className="p-3">
                      {conv.tool ? (
                        <Link
                          href={`/admin/tools/${conv.tool.id}`}
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <Wrench className="h-3 w-3" />
                          {conv.tool.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </td>
                    <td className="p-3 text-right text-muted-foreground text-sm">
                      {formatDate(conv.updatedAt)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        basePath={basePath}
      />
    </div>
  );
}
