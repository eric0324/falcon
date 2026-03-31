import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/knowledge-bases — list knowledge bases visible to user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  // System ADMIN sees all, others see their own + member of
  const knowledgeBases = await prisma.knowledgeBase.findMany({
    where: user?.role === "ADMIN"
      ? {}
      : {
          OR: [
            { createdBy: userId },
            { members: { some: { userId } } },
          ],
        },
    orderBy: { updatedAt: "desc" },
    include: {
      creator: { select: { id: true, name: true } },
      _count: { select: { points: true, members: true } },
      reviews: { select: { rating: true } },
    },
  });

  const result = knowledgeBases.map((kb) => {
    const ratings = kb.reviews.map((r) => r.rating);
    const avgRating = ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : 0;
    const { reviews: _, ...rest } = kb;
    return {
      ...rest,
      averageRating: Math.round(avgRating * 10) / 10,
      reviewCount: ratings.length,
    };
  });

  return NextResponse.json(result);
}

// POST /api/knowledge-bases — create knowledge base
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, description, systemPrompt } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const kb = await prisma.knowledgeBase.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      systemPrompt: systemPrompt?.trim() || null,
      createdBy: session.user.id,
    },
  });

  return NextResponse.json(kb, { status: 201 });
}
