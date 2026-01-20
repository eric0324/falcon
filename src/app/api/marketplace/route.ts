import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/marketplace - Get marketplace tools
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(request.url);

  const section = searchParams.get("section"); // trending, newest, category
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const limit = parseInt(searchParams.get("limit") || "12");
  const offset = parseInt(searchParams.get("offset") || "0");

  try {
    // Build visibility filter (used in OR clause below)

    // Get user's department for DEPARTMENT visibility
    let userDepartment: string | null = null;
    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { department: true },
      });
      userDepartment = user?.department || null;
    }

    // Base where clause
    const where: Record<string, unknown> = {
      OR: [
        { visibility: "PUBLIC" },
        { visibility: "COMPANY" },
        ...(userDepartment
          ? [
              {
                visibility: "DEPARTMENT",
                author: { department: userDepartment },
              },
            ]
          : []),
      ],
    };

    // Add category filter
    if (category) {
      where.category = category;
    }

    // Add search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tags: { has: search } },
      ];
    }

    // Determine ordering based on section
    let orderBy: Record<string, unknown>[] = [{ createdAt: "desc" }];
    let includeStats = false;

    if (section === "trending") {
      includeStats = true;
      orderBy = [{ stats: { weeklyUsage: "desc" } }, { createdAt: "desc" }];
    } else if (section === "top-rated") {
      includeStats = true;
      orderBy = [{ stats: { weightedRating: "desc" } }, { createdAt: "desc" }];
    } else if (section === "most-used") {
      includeStats = true;
      orderBy = [{ stats: { totalUsage: "desc" } }, { createdAt: "desc" }];
    }

    const tools = await prisma.tool.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            department: true,
          },
        },
        stats: includeStats,
      },
      orderBy,
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const total = await prisma.tool.count({ where });

    // Fetch stats for tools if not already included
    const toolIds = tools.map((t) => t.id);
    const statsMap = new Map();

    if (!includeStats && toolIds.length > 0) {
      const stats = await prisma.toolStats.findMany({
        where: { toolId: { in: toolIds } },
      });
      stats.forEach((s) => statsMap.set(s.toolId, s));
    }

    const enrichedTools = tools.map((tool) => ({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      category: tool.category,
      tags: tool.tags,
      visibility: tool.visibility,
      createdAt: tool.createdAt,
      author: tool.author,
      stats: tool.stats || statsMap.get(tool.id) || {
        totalUsage: 0,
        weeklyUsage: 0,
        averageRating: 0,
        totalReviews: 0,
      },
    }));

    return NextResponse.json({
      tools: enrichedTools,
      total,
      hasMore: offset + tools.length < total,
    });
  } catch (error) {
    console.error("Failed to fetch marketplace tools:", error);
    return NextResponse.json(
      { error: "Failed to fetch tools" },
      { status: 500 }
    );
  }
}
