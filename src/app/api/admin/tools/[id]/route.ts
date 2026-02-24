import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

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
        visibility: true,
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
