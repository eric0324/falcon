import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { getMessages } from "@/lib/conversation-messages";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; conversationId: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id, conversationId } = await params;

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: id,
      },
      select: {
        id: true,
        title: true,
        model: true,
        summary: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const messages = await getMessages(conversationId);
    return NextResponse.json({ ...conversation, messages });
  } catch (error) {
    console.error("GET /api/admin/members/[id]/conversations/[conversationId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
