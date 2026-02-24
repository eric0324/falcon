import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Get user's company role IDs
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { companyRoles: { select: { id: true } } },
  });

  const roleIds = user?.companyRoles.map((r) => r.id) ?? [];

  if (roleIds.length === 0) {
    return NextResponse.json({ databases: [] });
  }

  // Find databases that have at least one non-hidden table accessible to the user
  const databases = await prisma.externalDatabase.findMany({
    where: {
      lastSyncedAt: { not: null },
      tables: {
        some: {
          hidden: false,
          allowedRoles: { some: { id: { in: roleIds } } },
        },
      },
    },
    select: {
      id: true,
      name: true,
      type: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ databases });
}
