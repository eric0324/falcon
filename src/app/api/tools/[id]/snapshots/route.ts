import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { listSnapshots } from "@/lib/tool-snapshot";

async function getUserId(session: { user?: { email?: string | null } } | null) {
  if (!session?.user?.email) return null;
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  return user?.id || null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  const userId = await getUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const tool = await prisma.tool.findUnique({
    where: { id },
    select: { authorId: true },
  });
  if (!tool) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (tool.authorId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const snapshots = await listSnapshots(id);
  return NextResponse.json(snapshots);
}
