import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

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
      updatedAt: true,
      tool: { select: { id: true } },
    },
  });

  const result = conversations.map((c) => ({
    id: c.id,
    title: c.title,
    model: c.model,
    updatedAt: c.updatedAt,
    hasTool: c.tool !== null,
  }));

  return NextResponse.json(result);
}

function generateTitle(messages: Array<{ role: string; content: string }>): string {
  const firstUserMessage = messages.find((m) => m.role === "user");
  if (!firstUserMessage) return "New conversation";
  const content = firstUserMessage.content.trim();
  return content.length > 50 ? content.slice(0, 50) : content;
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

  const title = generateTitle(messages);

  const conversation = await prisma.conversation.create({
    data: {
      title,
      messages,
      model: model || null,
      dataSources: dataSources || [],
      userId: session.user.id,
    },
  });

  // Link orphaned token usage records (from the chat request that preceded this creation)
  await prisma.tokenUsage.updateMany({
    where: {
      userId: session.user.id,
      conversationId: null,
      createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) },
    },
    data: { conversationId: conversation.id },
  });

  return NextResponse.json(conversation, { status: 201 });
}
