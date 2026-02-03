import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function getConversationIfOwned(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });
  if (!conversation) return { error: 404 as const, conversation: null };
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

  return NextResponse.json(conversation);
}

export async function PATCH(req: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await context.params;
  const { error } = await getConversationIfOwned(id, session.user.id);
  if (error) return new Response(error === 404 ? "Not found" : "Forbidden", { status: error });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.messages) data.messages = body.messages;
  if (body.title) data.title = body.title;
  if (body.model !== undefined) data.model = body.model;

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

  await prisma.conversation.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
