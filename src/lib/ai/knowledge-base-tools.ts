import { tool } from "ai";
import { z } from "zod";
import { hybridSearch } from "@/lib/knowledge/search";
import { prisma } from "@/lib/prisma";

export function createKnowledgeBaseTools(knowledgeBaseIds: string[]) {
  return {
    queryKnowledgeBase: tool({
      description:
        "Search a knowledge base for relevant information. Use this tool when the user asks a question that may be answered by the selected knowledge base(s). Returns the most relevant knowledge points with similarity scores.",
      inputSchema: z.object({
        knowledgeBaseId: z
          .enum(knowledgeBaseIds as [string, ...string[]])
          .describe("The knowledge base ID to search"),
        query: z.string().describe("The search query — rephrase the user's question for optimal retrieval"),
      }),
      execute: async ({ knowledgeBaseId, query }) => {
        try {
          const results = await hybridSearch(knowledgeBaseId, query, 5);

          // Get KB info for context
          const kb = await prisma.knowledgeBase.findUnique({
            where: { id: knowledgeBaseId },
            select: { name: true, systemPrompt: true },
          });

          if (results.length === 0) {
            return {
              success: true,
              knowledgeBase: kb?.name || knowledgeBaseId,
              results: [],
              hint: "No relevant knowledge points found. Tell the user honestly that the knowledge base does not contain relevant information.",
            };
          }

          return {
            success: true,
            knowledgeBase: kb?.name || knowledgeBaseId,
            systemPrompt: kb?.systemPrompt || null,
            results: results.map((r, i) => ({
              index: i + 1,
              content: r.content,
              source: (r.metadata as Record<string, unknown>)?.source || null,
              score: Math.round(r.score * 1000) / 1000,
            })),
            hint: "Cite sources using [1], [2], etc. At the end of your answer, list citations like: [1] filename — brief topic. Follow the systemPrompt instructions if provided.",
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),
  };
}
