import { prisma } from "@/lib/prisma";
import { embedText } from "@/lib/knowledge/embedding";

interface RecallRow {
  id: string;
  type: string;
  title: string;
  content: string;
  distance: number;
}

export interface RecalledMemory {
  id: string;
  type: string;
  title: string;
  content: string;
}

export interface RecallResult {
  memories: RecalledMemory[];
  promptText: string;
}

const MAX_K = 5;
const PREFETCH = 10;
const DISTANCE_THRESHOLD = 0.6; // cosine distance < 0.6; voyage-3 短句改寫常落在 0.4-0.5
const MAX_CHARS = 2000;

export async function recallMemories(
  userMessage: string,
  userId: string
): Promise<RecallResult> {
  const text = userMessage.trim();
  if (!text) return { memories: [], promptText: "" };

  const embedding = await embedText(text);
  const vectorStr = `[${embedding.join(",")}]`;

  const rows = await prisma.$queryRawUnsafe<RecallRow[]>(
    `
    SELECT id, type::text AS type, title, content,
           (embedding <=> $1::vector)::float AS distance
    FROM "Memory"
    WHERE "userId" = $2 AND embedding IS NOT NULL
    ORDER BY embedding <=> $1::vector ASC
    LIMIT $3
    `,
    vectorStr,
    userId,
    PREFETCH
  );

  const filtered = rows
    .filter((r) => r.distance < DISTANCE_THRESHOLD)
    .slice(0, MAX_K);

  const kept: RecallRow[] = [];
  let totalChars = 0;
  for (const row of filtered) {
    if (totalChars + row.content.length > MAX_CHARS) break;
    kept.push(row);
    totalChars += row.content.length;
  }

  if (kept.length === 0) {
    return { memories: [], promptText: "" };
  }

  const promptText = [
    "## Personal Memories (recalled for this message)",
    "",
    ...kept.map((m) => `- [${m.type.toLowerCase()}] ${m.content}`),
  ].join("\n");

  return {
    memories: kept.map((m) => ({
      id: m.id,
      type: m.type,
      title: m.title,
      content: m.content,
    })),
    promptText,
  };
}
