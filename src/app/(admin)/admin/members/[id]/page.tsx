import { prisma } from "@/lib/prisma";
import { estimateCost } from "@/lib/ai/models";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ConversationList } from "./conversation-list";
import { Pagination } from "../../pagination";

const PAGE_SIZE = 10;

export default async function AdminMemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const currentPage = Math.max(1, parseInt(sp.page || "1", 10) || 1);

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, image: true, department: true },
  });

  if (!user) notFound();

  const [conversations, totalCount] = await Promise.all([
    prisma.conversation.findMany({
      where: { userId: id },
      orderBy: { updatedAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        model: true,
        updatedAt: true,
        deletedAt: true,
        _count: { select: { conversationMessages: true } },
        conversationMessages: {
          where: { role: "assistant" },
          select: { tokenUsages: true },
        },
      },
    }),
    prisma.conversation.count({ where: { userId: id } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const conversationData = conversations.map((conv) => {
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
      title: conv.title || "Untitled",
      messageCount: conv._count.conversationMessages,
      model: conv.model,
      totalTokens,
      estimatedCost,
      updatedAt: conv.updatedAt.toISOString(),
      deletedAt: conv.deletedAt?.toISOString() ?? null,
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
            ({totalCount})
          </span>
        </h2>
      </div>

      {conversationData.length === 0 && currentPage === 1 ? (
        <p className="text-muted-foreground py-8 text-center">尚無對話紀錄</p>
      ) : (
        <ConversationList
          conversations={conversationData}
          userId={user.id}
        />
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        basePath={`/admin/members/${id}`}
      />
    </div>
  );
}
