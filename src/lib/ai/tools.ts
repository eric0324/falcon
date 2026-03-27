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
  };
}

// Backwards compatibility — tools without draft context
export const studioTools = createStudioTools("", undefined);
