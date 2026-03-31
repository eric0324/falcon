import { prisma } from "@/lib/prisma";
import type { KnowledgeBaseRole } from "@prisma/client";

const ROLE_HIERARCHY: Record<KnowledgeBaseRole, number> = {
  VIEWER: 1,
  CONTRIBUTOR: 2,
  ADMIN: 3,
};

export async function getKnowledgeBaseRole(
  knowledgeBaseId: string,
  userId: string
): Promise<KnowledgeBaseRole | null> {
  // System ADMIN has full access
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user?.role === "ADMIN") return "ADMIN";

  // Check if user is the creator
  const kb = await prisma.knowledgeBase.findUnique({
    where: { id: knowledgeBaseId },
    select: { createdBy: true },
  });
  if (kb?.createdBy === userId) return "ADMIN";

  // Check membership
  const member = await prisma.knowledgeBaseMember.findUnique({
    where: { knowledgeBaseId_userId: { knowledgeBaseId, userId } },
    select: { role: true },
  });

  return member?.role ?? null;
}

export function hasMinRole(
  userRole: KnowledgeBaseRole | null,
  requiredRole: KnowledgeBaseRole
): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
