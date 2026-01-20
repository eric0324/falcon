import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/tools/:id/stats - Get tool statistics
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: toolId } = await params;

  try {
    const stats = await prisma.toolStats.findUnique({
      where: { toolId },
    });

    if (!stats) {
      // Return default stats if none exist
      return NextResponse.json({
        totalUsage: 0,
        weeklyUsage: 0,
        totalReviews: 0,
        averageRating: 0,
        weightedRating: 0,
        trendingScore: 0,
      });
    }

    return NextResponse.json({
      totalUsage: stats.totalUsage,
      weeklyUsage: stats.weeklyUsage,
      totalReviews: stats.totalReviews,
      averageRating: stats.averageRating,
      weightedRating: stats.weightedRating,
      trendingScore: stats.trendingScore,
    });
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
