import { prisma } from "@/lib/prisma";
import { embedText } from "./embedding";

interface SearchResult {
  id: string;
  content: string;
  metadata: Record<string, unknown> | null;
  score: number;
}

const TS_CONFIG = process.env.PG_TEXT_SEARCH_CONFIG || "simple";

export async function hybridSearch(
  knowledgeBaseId: string,
  query: string,
  topK: number = 5
): Promise<SearchResult[]> {
  // 1. Embed the query
  const queryEmbedding = await embedText(query);
  const vectorStr = `[${queryEmbedding.join(",")}]`;

  // 2. Hybrid search: vector + full-text, merged with RRF
  const results = await prisma.$queryRawUnsafe<SearchResult[]>(
    `
    WITH vector_results AS (
      SELECT id, content, metadata,
             ROW_NUMBER() OVER (ORDER BY embedding <=> $1::vector) AS rank
      FROM "KnowledgePoint"
      WHERE "knowledgeBaseId" = $2 AND status = 'APPROVED' AND embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT 20
    ),
    text_results AS (
      SELECT id, content, metadata,
             ROW_NUMBER() OVER (
               ORDER BY ts_rank(to_tsvector('${TS_CONFIG}', content), plainto_tsquery('${TS_CONFIG}', $3)) DESC
             ) AS rank
      FROM "KnowledgePoint"
      WHERE "knowledgeBaseId" = $2 AND status = 'APPROVED'
        AND to_tsvector('${TS_CONFIG}', content) @@ plainto_tsquery('${TS_CONFIG}', $3)
      LIMIT 20
    )
    SELECT
      COALESCE(v.id, t.id) AS id,
      COALESCE(v.content, t.content) AS content,
      COALESCE(v.metadata, t.metadata) AS metadata,
      (COALESCE(1.0/(60+v.rank), 0) + COALESCE(1.0/(60+t.rank), 0))::float AS score
    FROM vector_results v
    FULL OUTER JOIN text_results t ON v.id = t.id
    ORDER BY score DESC
    LIMIT $4
    `,
    vectorStr,
    knowledgeBaseId,
    query,
    topK
  );

  return results;
}
