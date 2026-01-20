import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/tools/:id/usage - Record tool usage or update duration
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: toolId } = await params;

  try {
    const body = await request.json();
    const { source, duration, usageId } = body;

    // If usageId is provided, this is a duration update (from sendBeacon)
    if (usageId) {
      const usage = await prisma.toolUsage.updateMany({
        where: {
          id: usageId,
          userId: session.user.id,
          toolId,
        },
        data: {
          duration: Math.round(duration),
        },
      });
      return NextResponse.json({ success: usage.count > 0 });
    }

    // Otherwise, record new usage
    const validSources = ["MARKETPLACE", "DIRECT", "SHARE"];
    const usageSource = validSources.includes(source) ? source : "DIRECT";

    // Check tool exists
    const tool = await prisma.tool.findUnique({
      where: { id: toolId },
    });

    if (!tool) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    // Record usage
    const usage = await prisma.toolUsage.create({
      data: {
        toolId,
        userId: session.user.id,
        source: usageSource,
        duration: duration ? Math.round(duration) : null,
      },
    });

    // Update ToolStats (upsert)
    await prisma.toolStats.upsert({
      where: { toolId },
      create: {
        toolId,
        totalUsage: 1,
        weeklyUsage: 1,
      },
      update: {
        totalUsage: { increment: 1 },
        weeklyUsage: { increment: 1 },
      },
    });

    return NextResponse.json({ success: true, id: usage.id });
  } catch (error) {
    console.error("Failed to record usage:", error);
    return NextResponse.json(
      { error: "Failed to record usage" },
      { status: 500 }
    );
  }
}

// PATCH /api/tools/:id/usage - Update duration for existing usage
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: toolId } = await params;

  try {
    const body = await request.json();
    const { usageId, duration } = body;

    if (!usageId || typeof duration !== "number") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Update usage duration (only if owned by current user)
    const usage = await prisma.toolUsage.updateMany({
      where: {
        id: usageId,
        userId: session.user.id,
        toolId,
      },
      data: {
        duration: Math.round(duration),
      },
    });

    if (usage.count === 0) {
      return NextResponse.json({ error: "Usage not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update usage:", error);
    return NextResponse.json(
      { error: "Failed to update usage" },
      { status: 500 }
    );
  }
}
