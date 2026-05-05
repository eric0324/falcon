import { prisma } from "@/lib/prisma";
import { embedText } from "@/lib/knowledge/embedding";

export async function embedAndStoreMemory(
  memoryId: string,
  content: string
): Promise<void> {
  const embedding = await embedText(content);
  const vectorStr = `[${embedding.join(",")}]`;
  await prisma.$executeRawUnsafe(
    `UPDATE "Memory" SET embedding = $1::vector WHERE id = $2`,
    vectorStr,
    memoryId
  );
}
