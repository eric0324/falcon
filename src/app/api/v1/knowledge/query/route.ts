import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { prisma } from "@/lib/prisma";
import { getKnowledgeBaseRole } from "@/lib/knowledge/permissions";
import { hybridSearch } from "@/lib/knowledge/search";

// POST /api/v1/knowledge/query — query a knowledge base
export async function POST(req: Request) {
  const auth = await authenticateApiKey(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { userId } = auth;
  const body = await req.json();
  const { knowledgeBaseId, query, topK } = body;

  if (!knowledgeBaseId || !query) {
    return NextResponse.json(
      { error: "knowledgeBaseId and query are required" },
      { status: 400 }
    );
  }

  // Check permission
  const role = await getKnowledgeBaseRole(knowledgeBaseId, userId);
  if (!role) {
    return NextResponse.json({ error: "Knowledge base not found or access denied" }, { status: 403 });
  }

  // Get KB info
  const kb = await prisma.knowledgeBase.findUnique({
    where: { id: knowledgeBaseId },
    select: { name: true, systemPrompt: true },
  });

  // Search
  const results = await hybridSearch(knowledgeBaseId, query, topK || 5);

  return NextResponse.json({
    knowledgeBase: kb?.name || knowledgeBaseId,
    query,
    results: results.map((r, i) => ({
      index: i + 1,
      content: r.content,
      source: (r.metadata as Record<string, unknown>)?.source || null,
      score: Math.round(r.score * 1000) / 1000,
    })),
    systemPrompt: kb?.systemPrompt || null,
  });
}
