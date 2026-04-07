import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getKnowledgeBaseRole, hasMinRole } from "@/lib/knowledge/permissions";
import { vectorizeQueue } from "@/lib/queue/queues";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/knowledge-bases/:id/points/review — batch approve/reject
export async function POST(req: Request, context: RouteContext) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const role = await getKnowledgeBaseRole(id, session.user.id);
  if (!hasMinRole(role, "CONTRIBUTOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { pointIds, action } = body as { pointIds: string[]; action: "approve" | "reject" };

  if (!pointIds?.length || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Verify all points belong to this knowledge base
  const points = await prisma.knowledgePoint.findMany({
    where: { id: { in: pointIds }, knowledgeBaseId: id },
    select: { id: true },
  });

  const validIds = points.map((p) => p.id);
  if (validIds.length === 0) {
    return NextResponse.json({ error: "No valid points found" }, { status: 400 });
  }

  const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

  await prisma.knowledgePoint.updateMany({
    where: { id: { in: validIds } },
    data: {
      status: newStatus,
      reviewedBy: session.user.id,
    },
  });

  // If approved, enqueue vectorization
  if (action === "approve") {
    // Split into batches of 50
    for (let i = 0; i < validIds.length; i += 50) {
      const batch = validIds.slice(i, i + 50);
      await vectorizeQueue.add("vectorize", { pointIds: batch });
    }
  }

  return NextResponse.json({
    updated: validIds.length,
    status: newStatus,
  });
}
