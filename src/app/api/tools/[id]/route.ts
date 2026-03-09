import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canUserAccessTool } from "@/lib/tool-visibility";
import { runRuleScan } from "@/lib/code-scan/rules";
import { scanOnDeploy } from "@/lib/code-scan";

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
        allowedGroups: {
          select: { id: true, name: true },
        },
        conversation: {
          include: {
            conversationMessages: {
              orderBy: { orderIndex: "asc" as const },
              select: { role: true, content: true, toolCalls: true },
            },
          },
        },
      },
    });

    if (!tool) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    // Check access based on visibility
    const hasAccess = await canUserAccessTool(tool, userId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Transform conversationMessages back to messages for API compatibility
    const { conversation, ...rest } = tool;
    const transformed = {
      ...rest,
      conversation: conversation
        ? {
            messages: conversation.conversationMessages.map((m) => ({
              role: m.role,
              content: m.content,
              ...(m.toolCalls ? { toolCalls: m.toolCalls } : {}),
            })),
          }
        : null,
    };

    return NextResponse.json(transformed);
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
    const { name, description, code, category, tags, visibility, conversationId, dataSources, allowedGroupIds } = await req.json();

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

    // Run rule scan if code is being updated
    let codeFindings: ReturnType<typeof runRuleScan> | undefined;
    if (code) {
      codeFindings = runRuleScan(code);
      const hasCritical = codeFindings.some((f) => f.severity === "critical");
      if (hasCritical) {
        return NextResponse.json(
          { error: "code_scan_failed", findings: codeFindings },
          { status: 400 }
        );
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
        ...(conversationId && !existingTool.conversationId && { conversationId }),
        ...(dataSources !== undefined && { dataSources }),
        ...(allowedGroupIds !== undefined && {
          allowedGroups: {
            set: Array.isArray(allowedGroupIds)
              ? allowedGroupIds.map((gid: string) => ({ id: gid }))
              : [],
          },
        }),
      },
    });

    // Save scan result + background LLM analysis (pass pre-computed findings)
    if (code) {
      scanOnDeploy(tool.id, code, codeFindings).catch(() => {});
    }

    // Include non-critical findings in response so frontend can warn the user
    const warnings = codeFindings?.filter((f) => f.severity !== "critical");
    return NextResponse.json({ ...tool, scanWarnings: warnings && warnings.length > 0 ? warnings : undefined });
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
