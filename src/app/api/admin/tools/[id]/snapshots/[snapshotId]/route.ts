import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; snapshotId: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id, snapshotId } = await params;

    const snapshot = await prisma.toolCodeSnapshot.findUnique({
      where: { id: snapshotId },
      select: { id: true, toolId: true },
    });

    if (!snapshot || snapshot.toolId !== id) {
      return NextResponse.json(
        { error: "Snapshot not found" },
        { status: 404 }
      );
    }

    await prisma.toolCodeSnapshot.delete({ where: { id: snapshotId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/admin/tools/[id]/snapshots/[snapshotId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
