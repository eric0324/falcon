import { prisma } from "@/lib/prisma";
import { estimateCost } from "@/lib/ai/models";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ConversationList } from "./conversation-list";

export default async function AdminMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, image: true, department: true },
  });

  if (!user) notFound();

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
      },
    }),
    prisma.tokenUsage.groupBy({
      by: ["conversationId", "model"],
      where: { userId: id, conversationId: { not: null } },
      _sum: { inputTokens: true, outputTokens: true, totalTokens: true },
    }),
  ]);

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

  const conversationData = conversations.map((conv) => {
    const stats = convStatsMap.get(conv.id);
    return {
      id: conv.id,
      title: conv.title || "Untitled",
      messageCount: Array.isArray(conv.messages) ? conv.messages.length : 0,
      model: conv.model,
      totalTokens: stats?.totalTokens ?? 0,
      estimatedCost: stats?.estimatedCost ?? 0,
      updatedAt: conv.updatedAt.toISOString(),
    };
  });

  return (
    <div className="p-6">
      <Link
        href="/admin/members"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        返回成員列表
      </Link>

      <div className="flex items-center gap-4 mb-6">
        <Avatar className="h-12 w-12">
          {user.image && <AvatarImage src={user.image} alt={user.name || ""} />}
          <AvatarFallback>{user.name?.slice(0, 1).toUpperCase() || "?"}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">{user.name || user.email}</h1>
          <p className="text-muted-foreground">
            {user.email}
            {user.department && ` / ${user.department}`}
          </p>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-lg font-semibold">
          對話紀錄
          <span className="text-muted-foreground font-normal ml-2">
            ({conversationData.length})
          </span>
        </h2>
      </div>

      {conversationData.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">尚無對話紀錄</p>
      ) : (
        <ConversationList
          conversations={conversationData}
          userId={user.id}
        />
      )}
    </div>
  );
}
