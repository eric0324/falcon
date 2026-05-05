import { prisma } from "@/lib/prisma";
import type {
  MemoryType,
  MemorySource,
  MemoryConfidence,
} from "@prisma/client";
import { embedAndStoreMemory } from "./embed";

export interface MemoryDraft {
  type: MemoryType;
  title: string;
  content: string;
  source: MemorySource;
  confidence: MemoryConfidence;
}

export async function createMemory(userId: string, draft: MemoryDraft) {
  const memory = await prisma.memory.create({
    data: {
      userId,
      type: draft.type,
      title: draft.title.slice(0, 120),
      content: draft.content,
      source: draft.source,
      confidence: draft.confidence,
    },
  });
  await embedAndStoreMemory(memory.id, draft.content);
  return memory;
}

export async function listMemoriesByUser(userId: string) {
  return prisma.memory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateMemory(
  id: string,
  userId: string,
  updates: { title?: string; content?: string; type?: MemoryType }
) {
  const existing = await prisma.memory.findFirst({
    where: { id, userId },
  });
  if (!existing) return null;

  const updated = await prisma.memory.update({
    where: { id },
    data: {
      ...(updates.title !== undefined && { title: updates.title.slice(0, 120) }),
      ...(updates.content !== undefined && { content: updates.content }),
      ...(updates.type !== undefined && { type: updates.type }),
    },
  });

  if (updates.content !== undefined && updates.content !== existing.content) {
    await embedAndStoreMemory(id, updates.content);
  }

  return updated;
}

export async function deleteMemory(
  id: string,
  userId: string
): Promise<boolean> {
  const result = await prisma.memory.deleteMany({
    where: { id, userId },
  });
  return result.count > 0;
}

export async function countUserMemories(userId: string): Promise<number> {
  return prisma.memory.count({ where: { userId } });
}
