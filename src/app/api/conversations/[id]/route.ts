import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getMessages, replaceMessages, linkOrphanTokenUsage } from "@/lib/conversation-messages";
import type { Message } from "@/types/message";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function getConversationIfOwned(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { tool: { select: { id: true, status: true } } },
  });
  if (!conversation || conversation.deletedAt) return { error: 404 as const, conversation: null };
  if (conversation.userId !== userId) return { error: 403 as const, conversation: null };
  return { error: null, conversation };
}

export async function GET(_req: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await context.params;
  const { error, conversation } = await getConversationIfOwned(id, session.user.id);
  if (error) return new Response(error === 404 ? "Not found" : "Forbidden", { status: error });

  const messages = await getMessages(id);
  return NextResponse.json({ ...conversation, messages });
}

export async function PATCH(req: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await context.params;
  const body = await req.json();

  // Restore allows undeleting a soft-deleted conversation
  if (body.restore) {
    const conversation = await prisma.conversation.findUnique({ where: { id } });
    if (!conversation) return new Response("Not found", { status: 404 });
    if (conversation.userId !== session.user.id) return new Response("Forbidden", { status: 403 });
    const updated = await prisma.conversation.update({
      where: { id },
      data: { deletedAt: null },
    });
    return NextResponse.json(updated);
  }

  const { error } = await getConversationIfOwned(id, session.user.id);
  if (error) return new Response(error === 404 ? "Not found" : "Forbidden", { status: error });

  const data: Record<string, unknown> = {};

  if (body.title) data.title = body.title;
  if (body.model !== undefined) data.model = body.model;
  if (body.summary !== undefined) data.summary = body.summary;
  if (body.dataSources !== undefined) data.dataSources = body.dataSources;
  if (body.starred !== undefined) data.starred = body.starred;

  // Update messages in the new table if provided
  if (body.messages) {
    const assistantMessageIds = await replaceMessages(id, body.messages as Message[]);
    const lastAssistantId = assistantMessageIds.at(-1);
    if (lastAssistantId) {
      await linkOrphanTokenUsage(session.user.id, lastAssistantId);
    }
  }

  const updated = await prisma.conversation.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await context.params;
  const { error } = await getConversationIfOwned(id, session.user.id);
  if (error) return new Response(error === 404 ? "Not found" : "Forbidden", { status: error });

  // Soft delete - set deletedAt instead of actually deleting
  await prisma.conversation.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
