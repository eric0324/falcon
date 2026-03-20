import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_CATEGORIES = ["analytics", "marketing", "project-management", "writing", "other"] as const;
const VALID_VISIBILITY = ["private", "public"] as const;

const updateSkillSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().min(1).max(200).optional(),
  prompt: z.string().min(1).max(2000).optional(),
  requiredDataSources: z.array(z.string()).optional(),
  category: z.enum(VALID_CATEGORIES).optional(),
  visibility: z.enum(VALID_VISIBILITY).optional(),
});

// PUT /api/skills/[id]
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const skill = await prisma.skill.findUnique({ where: { id } });
  if (!skill) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (skill.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSkillSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.skill.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}

// DELETE /api/skills/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const skill = await prisma.skill.findUnique({ where: { id } });
  if (!skill) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (skill.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.skill.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
