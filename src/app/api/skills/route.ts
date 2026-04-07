import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const VALID_CATEGORIES = ["analytics", "marketing", "project-management", "writing", "other"] as const;
const VALID_VISIBILITY = ["private", "public"] as const;

const createSkillSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().min(1).max(200),
  prompt: z.string().min(1).max(2000),
  requiredDataSources: z.array(z.string()).default([]),
  category: z.enum(VALID_CATEGORIES),
  visibility: z.enum(VALID_VISIBILITY).default("private"),
});

// GET /api/skills — 取得公開 skills + 自己的 skills
export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    OR: [
      { userId: session.user.id },
      { visibility: "public" },
    ],
  };

  if (category) {
    where.category = category;
  }

  if (search) {
    where.AND = [
      {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      },
    ];
  }

  const skills = await prisma.skill.findMany({
    where,
    orderBy: { usageCount: "desc" },
    select: {
      id: true,
      userId: true,
      name: true,
      description: true,
      prompt: true,
      requiredDataSources: true,
      category: true,
      visibility: true,
      usageCount: true,
      createdAt: true,
      user: { select: { name: true } },
    },
  });

  return NextResponse.json(skills);
}

// POST /api/skills — 建立 skill
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSkillSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const skill = await prisma.skill.create({
    data: {
      ...parsed.data,
      userId: session.user.id,
    },
  });

  return NextResponse.json(skill, { status: 201 });
}
