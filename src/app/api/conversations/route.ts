import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { generateConversationTitle } from "@/lib/ai/generate-title";
import { createConversationWithMessages, linkOrphanTokenUsage } from "@/lib/conversation-messages";
import type { Message } from "@/types/message";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "20", 10);

  const conversations = await prisma.conversation.findMany({
    where: {
      userId: session.user.id,
      deletedAt: null,
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      model: true,
      starred: true,
      updatedAt: true,
      tool: { select: { id: true } },
    },
  });

  const result = conversations.map((c) => ({
    id: c.id,
    title: c.title,
    model: c.model,
    starred: c.starred,
    updatedAt: c.updatedAt,
    hasTool: c.tool !== null,
  }));

  return NextResponse.json(result);
}

function getFirstUserContent(messages: Array<{ role: string; content: string }>): string | undefined {
  return messages.find((m) => m.role === "user")?.content;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const { messages, model, dataSources } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response("messages is required", { status: 400 });
  }

  const title = await generateConversationTitle(getFirstUserContent(messages));

  const { conversation, assistantMessageIds } = await createConversationWithMessages({
    title,
    model: model || null,
    userId: session.user.id,
    messages: messages as Message[],
    dataSources: dataSources || undefined,
  });

  // Link orphaned token usage records to the last assistant message
  const lastAssistantId = assistantMessageIds.at(-1);
  if (lastAssistantId) {
    await linkOrphanTokenUsage(session.user.id, lastAssistantId);
  }

  return NextResponse.json(conversation, { status: 201 });
}
