import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
    const { name, description, code, category, tags, visibility, conversationId, dataSources, allowedGroupIds } = await req.json();

    if (!name || !code) {
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    // Run rule scan before saving
    const findings = runRuleScan(code);
    const hasCritical = findings.some((f) => f.severity === "critical");
    if (hasCritical) {
      return NextResponse.json(
        { error: "code_scan_failed", findings },
        { status: 400 }
      );
    }

    const groupConnect = visibility === "GROUP" && Array.isArray(allowedGroupIds) && allowedGroupIds.length > 0
      ? { allowedGroups: { set: allowedGroupIds.map((id: string) => ({ id })) } }
      : {};

    const toolData = {
      name,
      description,
      code,
      category: category || null,
      tags: tags || [],
      visibility: visibility || "PRIVATE",
      dataSources: dataSources || undefined,
    };

    let tool;
    let isNew = false;

    if (conversationId) {
      tool = await prisma.tool.upsert({
        where: { conversationId },
        create: {
          ...toolData,
          authorId: userId,
          conversationId,
          ...(visibility === "GROUP" && Array.isArray(allowedGroupIds) && allowedGroupIds.length > 0
            ? { allowedGroups: { connect: allowedGroupIds.map((id: string) => ({ id })) } }
            : {}),
        },
        update: {
          ...toolData,
          ...groupConnect,
        },
      });

      // Check if this was a new record by comparing createdAt and updatedAt
      isNew = tool.createdAt.getTime() === tool.updatedAt.getTime();
    } else {
      tool = await prisma.tool.create({
        data: {
          ...toolData,
          authorId: userId,
          ...(visibility === "GROUP" && Array.isArray(allowedGroupIds) && allowedGroupIds.length > 0
            ? { allowedGroups: { connect: allowedGroupIds.map((id: string) => ({ id })) } }
            : {}),
        },
      });
      isNew = true;
    }

    if (isNew) {
      await prisma.toolStats.create({
        data: {
          toolId: tool.id,
        },
      });
    }

    // Save scan result + background LLM analysis (pass pre-computed findings)
    scanOnDeploy(tool.id, code, findings).catch(() => {});

    // Include non-critical findings in response so frontend can warn the user
    const warnings = findings.filter((f) => f.severity !== "critical");
    return NextResponse.json({ ...tool, scanWarnings: warnings.length > 0 ? warnings : undefined });
  } catch (error) {
    console.error("POST /api/tools error:", error);
    return NextResponse.json(
      { error: "Failed to create tool" },
      { status: 500 }
    );
  }
}
