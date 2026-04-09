import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

/**
 * Create studio tools with context for draft tool creation.
 * When updateCode is called, it automatically creates/updates a draft tool
 * so that toolId is available before the preview renders.
 */
export function createStudioTools(userId: string, conversationId?: string) {
  return {
    updateCode: tool({
      description: "產生或更新 UI 程式碼。僅在使用者明確要求建立介面、工具、表格、圖表、儀表板時才使用。如果使用者只是問問題或查資料，不要呼叫此工具。",
      inputSchema: z.object({
        code: z.string().describe("完整的 React 元件程式碼（純 JavaScript/JSX，不要包含 ```jsx 等 markdown 標記）"),
        explanation: z.string().describe("簡短說明這次更新做了什麼（繁體中文）"),
      }),
      execute: async ({ code, explanation }) => {
        let toolId: string | undefined;

        // Create or update draft tool if we have a conversationId
        if (conversationId) {
          try {
            const existing = await prisma.tool.findUnique({
              where: { conversationId },
              select: { id: true },
            });

            if (existing) {
              await prisma.tool.update({
                where: { id: existing.id },
                data: { code },
              });
              toolId = existing.id;
            } else {
              const draft = await prisma.tool.create({
                data: {
                  name: "未命名工具",
                  code,
                  status: "DRAFT",
                  authorId: userId,
                  conversationId,
                },
              });
              toolId = draft.id;
            }
          } catch {
            // Draft creation is best-effort, don't block code generation
          }
        }

        return {
          type: "code_update",
          code,
          explanation,
          toolId,
        };
      },
    }),
    updateDocument: tool({
      description: "產生或更新 Markdown 文件。當使用者要求撰寫文件、報告、企劃、文章、信件等文字內容時使用此工具，而非 updateCode。",
      inputSchema: z.object({
        markdown: z.string().describe("完整的 Markdown 文件內容（不要包含 ```markdown 等標記）"),
        title: z.string().describe("文件標題"),
        explanation: z.string().describe("簡短說明這次更新做了什麼（繁體中文）"),
      }),
      execute: async ({ markdown, title, explanation }) => {
        return {
          type: "document_update",
          markdown,
          title,
          explanation,
        };
      },
    }),
  };
}

/**
 * Tool for AI to suggest data sources when the user's request
 * requires a data source that is not currently enabled.
 */
export const suggestDataSourcesTool = {
  suggestDataSources: tool({
    description:
      "Suggest data sources that the user should enable. Call this INSTEAD of telling the user to enable data sources manually. The frontend will render a selection UI.",
    inputSchema: z.object({
      sources: z
        .array(z.string())
        .describe("Data source IDs to suggest, e.g. meta_ads, notion, google_sheets"),
      reason: z
        .string()
        .describe("Brief explanation in Traditional Chinese of why these sources are needed"),
    }),
    execute: async ({ sources, reason }) => {
      return { type: "suggest_data_sources", sources, reason };
    },
  }),
};

// Backwards compatibility — tools without draft context
export const studioTools = createStudioTools("", undefined);
