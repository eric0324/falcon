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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const userId = await getUserId(session);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const tool = await prisma.tool.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        conversation: {
          select: {
            messages: true,
          },
        },
      },
    });

    if (!tool) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    // Check access based on visibility
    if (tool.visibility === "PRIVATE" && tool.authorId !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json(tool);
  } catch (error) {
    console.error("GET /api/tools/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tool" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const userId = await getUserId(session);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { name, description, code, messages, category, tags, visibility, allowedSources } = await req.json();

    // Check ownership
    const existingTool = await prisma.tool.findUnique({
      where: { id },
    });

    if (!existingTool) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    if (existingTool.authorId !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Update conversation if messages provided
    if (messages && messages.length > 0) {
      if (existingTool.conversationId) {
        await prisma.conversation.update({
          where: { id: existingTool.conversationId },
          data: { messages },
        });
      } else {
        const conversation = await prisma.conversation.create({
          data: {
            userId: userId,
            messages,
          },
        });
        await prisma.tool.update({
          where: { id },
          data: { conversationId: conversation.id },
        });
      }
    }

    const tool = await prisma.tool.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(code && { code }),
        ...(category !== undefined && { category: category || null }),
        ...(tags !== undefined && { tags }),
        ...(visibility && { visibility }),
        ...(allowedSources !== undefined && { allowedSources }),
      },
    });

    return NextResponse.json(tool);
  } catch (error) {
    console.error("PATCH /api/tools/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update tool" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const userId = await getUserId(session);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Check ownership
    const tool = await prisma.tool.findUnique({
      where: { id },
    });

    if (!tool) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    if (tool.authorId !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await prisma.tool.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tools/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete tool" },
      { status: 500 }
    );
  }
}
