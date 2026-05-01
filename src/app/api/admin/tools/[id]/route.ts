import { NextResponse } from "next/server";
import { Prisma, type Visibility, type ToolStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { applyCodeUpdate } from "@/lib/tool-snapshot";
import { runRuleScan, scanOnDeploy } from "@/lib/code-scan";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;

    const tool = await prisma.tool.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        code: true,
        visibility: true,
        status: true,
        category: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: { id: true, name: true, email: true, image: true },
        },
        stats: {
          select: {
            totalUsage: true,
            weeklyUsage: true,
            totalReviews: true,
            averageRating: true,
            weightedRating: true,
            trendingScore: true,
          },
        },
        reviews: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            rating: true,
            content: true,
            createdAt: true,
            user: {
              select: { name: true, email: true, image: true },
            },
            replies: {
              select: {
                content: true,
                createdAt: true,
                user: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!tool) {
      return NextResponse.json(
        { error: "Tool not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(tool);
  } catch (error) {
    console.error("GET /api/admin/tools/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const VISIBILITIES = ["PRIVATE", "GROUP", "COMPANY", "PUBLIC"] as const satisfies readonly Visibility[];
const STATUSES = ["DRAFT", "PUBLISHED"] as const satisfies readonly ToolStatus[];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await req.json();
    const { name, description, code, visibility, status } = body as {
      name?: string;
      description?: string | null;
      code?: string;
      visibility?: Visibility;
      status?: ToolStatus;
    };

    if (visibility && !VISIBILITIES.includes(visibility)) {
      return NextResponse.json({ error: "invalid_visibility" }, { status: 400 });
    }
    if (status && !STATUSES.includes(status)) {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }

    const existing = await prisma.tool.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    let codeFindings: ReturnType<typeof runRuleScan> | undefined;
    if (typeof code === "string") {
      codeFindings = runRuleScan(code);
      await applyCodeUpdate(id, code, "Agent 發現異常並修改");
    }

    const data: Prisma.ToolUpdateInput = {};
    if (typeof name === "string" && name.trim()) data.name = name.trim();
    if (description !== undefined) data.description = description;
    if (visibility) data.visibility = visibility;
    if (status) data.status = status;

    const tool = Object.keys(data).length
      ? await prisma.tool.update({ where: { id }, data })
      : await prisma.tool.findUniqueOrThrow({ where: { id } });

    if (typeof code === "string") {
      scanOnDeploy(tool.id, code, codeFindings).catch(() => {});
    }

    const warnings = codeFindings?.filter((f) => f.severity !== "info");
    return NextResponse.json({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      visibility: tool.visibility,
      status: tool.status,
      scanWarnings: warnings && warnings.length > 0 ? warnings : undefined,
    });
  } catch (error) {
    console.error("PATCH /api/admin/tools/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
