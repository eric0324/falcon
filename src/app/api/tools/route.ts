import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getUserId(session: { user?: { email?: string | null } } | null) {
  if (!session?.user?.email) return null;
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  return user?.id || null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = await getUserId(session);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tools = await prisma.tool.findMany({
      where: {
        authorId: userId,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        name: true,
        description: true,
        visibility: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(tools);
  } catch (error) {
    console.error("GET /api/tools error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tools" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = await getUserId(session);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, description, code, messages, category, tags, visibility, allowedSources } = await req.json();

    if (!name || !code) {
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    // Create conversation if messages exist
    let conversationId: string | undefined;
    if (messages && messages.length > 0) {
      const conversation = await prisma.conversation.create({
        data: {
          userId: userId,
          messages: messages,
        },
      });
      conversationId = conversation.id;
    }

    const tool = await prisma.tool.create({
      data: {
        name,
        description,
        code,
        category: category || null,
        tags: tags || [],
        visibility: visibility || "PRIVATE",
        allowedSources: allowedSources || [],
        authorId: userId,
        conversationId,
      },
    });

    // Initialize stats for the tool
    await prisma.toolStats.create({
      data: {
        toolId: tool.id,
      },
    });

    return NextResponse.json(tool);
  } catch (error) {
    console.error("POST /api/tools error:", error);
    return NextResponse.json(
      { error: "Failed to create tool" },
      { status: 500 }
    );
  }
}
