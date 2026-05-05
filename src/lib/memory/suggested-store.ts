import { prisma } from "@/lib/prisma";
import type { MemoryType } from "@prisma/client";
import { createMemory } from "./store";

export interface SuggestedMemoryDraft {
  type: MemoryType;
  title: string;
  content: string;
  conversationId?: string | null;
}

export async function createSuggestedMemory(
  userId: string,
  draft: SuggestedMemoryDraft
) {
  return prisma.suggestedMemory.create({
    data: {
      userId,
      type: draft.type,
      title: draft.title.slice(0, 120),
      content: draft.content,
      conversationId: draft.conversationId ?? null,
      status: "PENDING",
    },
  });
}

export async function listPendingSuggested(
  userId: string,
  conversationId?: string
) {
  return prisma.suggestedMemory.findMany({
    where: {
      userId,
      status: "PENDING",
      ...(conversationId ? { conversationId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function acceptSuggested(id: string, userId: string) {
  const s = await prisma.suggestedMemory.findFirst({
    where: { id, userId, status: "PENDING" },
  });
  if (!s) return null;

  const memory = await createMemory(userId, {
    type: s.type,
    title: s.title,
    content: s.content,
    source: "SUGGESTED",
    confidence: "MEDIUM",
  });

  await prisma.suggestedMemory.update({
    where: { id },
    data: { status: "ACCEPTED", acceptedMemoryId: memory.id },
  });

  return memory;
}

export async function dismissSuggested(
  id: string,
  userId: string
): Promise<boolean> {
  const result = await prisma.suggestedMemory.updateMany({
    where: { id, userId, status: "PENDING" },
    data: { status: "DISMISSED" },
  });
  return result.count > 0;
}
