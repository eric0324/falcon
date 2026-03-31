import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { prisma } from "@/lib/prisma";

// GET /api/v1/knowledge/bases — list knowledge bases accessible by API key user
export async function GET(req: Request) {
  const auth = await authenticateApiKey(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { userId } = auth;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  const knowledgeBases = await prisma.knowledgeBase.findMany({
    where: user?.role === "ADMIN"
      ? {}
      : {
          OR: [
            { createdBy: userId },
            { members: { some: { userId } } },
          ],
        },
    select: {
      id: true,
      name: true,
      description: true,
      _count: { select: { points: { where: { status: "APPROVED" } } } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    bases: knowledgeBases.map((kb) => ({
      id: kb.id,
      name: kb.name,
      description: kb.description,
      approvedPoints: kb._count.points,
    })),
  });
}
