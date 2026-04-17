import { prisma } from "@/lib/prisma";

const MAX_SNAPSHOTS_PER_TOOL = 20;

/**
 * Snapshot the current tool code and replace it with `newCode` in a single
 * transaction. Skips snapshot + update when `newCode` equals the current
 * `code`. After insertion, trims the tool's snapshots so only the most recent
 * {@link MAX_SNAPSHOTS_PER_TOOL} remain.
 */
export async function applyCodeUpdate(
  toolId: string,
  newCode: string,
  explanation?: string | null
): Promise<{ updated: boolean }> {
  // Quick pre-check outside the transaction — we can skip all DB work when
  // the code hasn't changed (avoids eating into the connection pool).
  const current = await prisma.tool.findUnique({
    where: { id: toolId },
    select: { code: true },
  });
  if (!current) throw new Error(`Tool ${toolId} not found`);
  if (current.code === newCode) return { updated: false };

  // Snapshot + update code atomically. Trim old snapshots outside the
  // transaction as best-effort cleanup so a slow / blocked DELETE doesn't
  // stall the critical path (which would leave tool calls hanging).
  await prisma.$transaction(
    async (tx) => {
      await tx.toolCodeSnapshot.create({
        data: {
          toolId,
          code: current.code,
          explanation: explanation ?? null,
        },
      });
      await tx.tool.update({
        where: { id: toolId },
        data: { code: newCode },
      });
    },
    { timeout: 15_000 }
  );

  // Best-effort trim — failures here don't affect correctness (at worst the
  // tool keeps a few extra snapshots until the next update).
  prisma.toolCodeSnapshot
    .findMany({
      where: { toolId },
      orderBy: { createdAt: "desc" },
      skip: MAX_SNAPSHOTS_PER_TOOL,
      select: { id: true },
    })
    .then((extras) => {
      if (extras.length === 0) return;
      return prisma.toolCodeSnapshot.deleteMany({
        where: { id: { in: extras.map((s) => s.id) } },
      });
    })
    .catch((err: unknown) => {
      console.error("[applyCodeUpdate] snapshot trim failed:", err);
    });

  return { updated: true };
}

/** List the most recent snapshots for a tool, without the code field. */
export async function listSnapshots(toolId: string) {
  return prisma.toolCodeSnapshot.findMany({
    where: { toolId },
    orderBy: { createdAt: "desc" },
    select: { id: true, explanation: true, createdAt: true },
    take: MAX_SNAPSHOTS_PER_TOOL,
  });
}

/**
 * Restore a tool to the state of the given snapshot. The current code is
 * snapshotted first so the restore itself can be undone.
 */
export async function restoreSnapshot(toolId: string, snapshotId: string) {
  const snapshot = await prisma.toolCodeSnapshot.findUnique({
    where: { id: snapshotId },
  });
  if (!snapshot || snapshot.toolId !== toolId) {
    throw new Error(`Snapshot ${snapshotId} not found for tool ${toolId}`);
  }

  await applyCodeUpdate(
    toolId,
    snapshot.code,
    `還原至 ${snapshot.createdAt.toISOString()} 版本`
  );

  return prisma.tool.findUniqueOrThrow({ where: { id: toolId } });
}
