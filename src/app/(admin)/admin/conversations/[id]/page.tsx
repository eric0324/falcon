import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Star, Wrench, Trash2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MessageList } from "../message-list";

export const metadata = { title: "對話內容" };

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
  return new Date(date).toLocaleString("zh-TW", {
    year: "numeric",
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

export default async function AdminConversationViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const conv = await prisma.conversation.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      model: true,
      starred: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, name: true, email: true, image: true } },
      tool: { select: { id: true, name: true } },
      conversationMessages: {
        orderBy: { orderIndex: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          toolCalls: true,
          attachments: true,
          createdAt: true,
          tokenUsages: {
            select: {
              kind: true,
              totalTokens: true,
              units: true,
              costUsd: true,
            },
          },
        },
      },
    },
  });

  if (!conv) notFound();

  let totalTokens = 0;
  let totalAudioMinutes = 0;
  let totalImages = 0;
  let billedCost = 0;
  for (const msg of conv.conversationMessages) {
    for (const usage of msg.tokenUsages) {
      billedCost += usage.costUsd || 0;
      if (usage.kind === "audio") {
        totalAudioMinutes += usage.units || 0;
      } else if (usage.kind === "image") {
        totalImages += usage.units || 0;
      } else {
        totalTokens += usage.totalTokens || 0;
      }
    }
  }

  const messages = conv.conversationMessages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    toolCalls: m.toolCalls,
    attachments: m.attachments,
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <div className="p-4 sm:p-6 max-w-5xl">
      <div className="mb-6">
        <Link
          href="/admin/conversations"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          回對話列表
        </Link>

        <div className="flex items-center gap-2 mb-2">
          {conv.starred && (
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          )}
          <h1 className="text-xl sm:text-2xl font-bold">
            {conv.title || "(未命名對話)"}
          </h1>
          {conv.deletedAt && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">
              <Trash2 className="h-3 w-3" />
              已刪除
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 p-3 border rounded-lg bg-muted/30 text-sm">
          <div>
            <div className="text-xs text-muted-foreground mb-1">使用者</div>
            <Link
              href={`/admin/members/${conv.user.id}`}
              className="flex items-center gap-2 hover:underline"
            >
              <Avatar className="h-5 w-5">
                {conv.user.image && (
                  <AvatarImage src={conv.user.image} alt={conv.user.name || ""} />
                )}
                <AvatarFallback className="text-[10px]">
                  {getInitials(conv.user.name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">
                {conv.user.name || conv.user.email}
              </span>
            </Link>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">模型</div>
            <div>{conv.model || "-"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">訊息數</div>
            <div>{messages.length}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">用量 / 費用</div>
            <div className="space-y-0.5">
              <div>
                {formatTokens(totalTokens)} tokens
                {totalAudioMinutes > 0 && ` · ${totalAudioMinutes} 分鐘`}
                {totalImages > 0 && ` · ${totalImages} 張`}
              </div>
              <div className="text-muted-foreground">{formatCost(billedCost)}</div>
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">建立時間</div>
            <div>{formatDate(conv.createdAt)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">最後活躍</div>
            <div>{formatDate(conv.updatedAt)}</div>
          </div>
          <div className="col-span-2">
            <div className="text-xs text-muted-foreground mb-1">演變為工具</div>
            {conv.tool ? (
              <Link
                href={`/admin/tools/${conv.tool.id}`}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <Wrench className="h-3.5 w-3.5" />
                {conv.tool.name}
              </Link>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </div>

      <MessageList messages={messages} />
    </div>
  );
}
