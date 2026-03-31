import type { Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import { embedTexts } from "@/lib/knowledge/embedding";

interface VectorizeData {
  pointIds: string[];
}

export async function vectorizeProcessor(job: Job<VectorizeData>) {
  const { pointIds } = job.data;

  // 1. Read approved points
  const points = await prisma.knowledgePoint.findMany({
    where: {
      id: { in: pointIds },
      status: "APPROVED",
    },
    select: { id: true, content: true },
  });

  if (points.length === 0) return { vectorized: 0 };

  // 2. Generate embeddings
  const texts = points.map((p) => p.content);
  const embeddings = await embedTexts(texts);

  // 3. Write embeddings via raw SQL
  for (let i = 0; i < points.length; i++) {
    const embedding = embeddings[i];
    const vectorStr = `[${embedding.join(",")}]`;
    await prisma.$executeRawUnsafe(
      `UPDATE "KnowledgePoint" SET embedding = $1::vector WHERE id = $2`,
      vectorStr,
      points[i].id
    );
  }

  return { vectorized: points.length };
}
