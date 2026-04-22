import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { applyCodeUpdate } from "@/lib/tool-snapshot";

function countOccurrences(haystack: string, needle: string): number {
  if (needle.length === 0) return 0;
  return haystack.split(needle).length - 1;
}

/**
 * 現有工具程式碼超過此 token 數時，一律停用 updateCode，只提供 editCode。
 * updateCode 的 code 參數會整份塞進 tool_use input，當 code 超過 maxOutputTokens
 * buffer 時 model 永遠寫不完、被 finishReason=length 切斷。約 1500 行 JSX。
 */
export const UPDATE_CODE_DISABLED_TOKEN_THRESHOLD = 6000;

export interface StudioToolsOptions {
  /** 現有工具程式碼的估算 token 數，用來決定是否暴露 updateCode。 */
  existingCodeTokens?: number;
}

/**
 * Create studio tools with context for draft tool creation.
 * When updateCode is called, it automatically creates/updates a draft tool
 * so that toolId is available before the preview renders.
 *
 * 若 `existingCodeTokens` 超過 UPDATE_CODE_DISABLED_TOKEN_THRESHOLD，
 * updateCode 會被排除，強制 AI 走 editCode 做局部修改。
 */
export function createStudioTools(
  userId: string,
  conversationId?: string,
  options: StudioToolsOptions = {}
) {
  const disableUpdateCode =
    (options.existingCodeTokens ?? 0) >= UPDATE_CODE_DISABLED_TOKEN_THRESHOLD;

  const updateCodeTool = tool({
    description:
      "產生或**整份重寫** UI 程式碼。僅在使用者明確要求建立新介面、或要求整體重構 / 重寫時使用。若只是小改（修 bug、改 label、調色、加欄位），請改用 editCode，避免不小心蓋掉其他功能。",
    inputSchema: z.object({
      code: z.string().describe("完整的 React 元件程式碼（純 JavaScript/JSX，不要包含 ```jsx 等 markdown 標記）。必須逐字保留使用者沒要求變更的既有功能；不確定時改用 editCode。"),
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
            await applyCodeUpdate(existing.id, code, explanation);
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
  });

  const editCodeTool = tool({
    description:
      "對現有工具程式碼做**局部替換**，只改使用者要求的那段，其他部分原封不動。小改幾乎都應走這條：修 bug、改 label、換顏色、加欄位、調樣式等。傳入的 find 必須在現行程式碼中**恰好出現一次**（帶足夠 context 讓它唯一），否則會報錯。",
    inputSchema: z.object({
      find: z.string().describe("要尋找的原始程式碼片段（exact string）。必須在當前 code 中只出現一次；若重複，加上前後幾行 context。"),
      replace: z.string().describe("替換後的程式碼片段。縮排、空白要自己保持一致。"),
      explanation: z.string().describe("簡短說明這次修改做了什麼（繁體中文）"),
    }),
    execute: async ({ find, replace, explanation }) => {
      if (!conversationId) {
        return {
          type: "edit_code_error" as const,
          reason: "editCode requires an active conversation with a draft tool; call updateCode first to create the tool.",
        };
      }

      const existing = await prisma.tool.findUnique({
        where: { conversationId },
        select: { id: true, code: true },
      });
      if (!existing) {
        return {
          type: "edit_code_error" as const,
          reason: "No draft tool found for this conversation; call updateCode first.",
        };
      }

      const occurrences = countOccurrences(existing.code, find);
      if (occurrences === 0) {
        return {
          type: "edit_code_error" as const,
          reason: "The find string was not found in the current code. Re-read the latest code and try again.",
        };
      }
      if (occurrences > 1) {
        return {
          type: "edit_code_error" as const,
          reason: `The find string matches ${occurrences} places. Include more surrounding context so it becomes unique, then retry.`,
        };
      }

      const newCode = existing.code.replace(find, replace);
      try {
        await applyCodeUpdate(existing.id, newCode, explanation);
      } catch (err) {
        return {
          type: "edit_code_error" as const,
          reason: err instanceof Error ? err.message : String(err),
        };
      }

      return {
        type: "code_update" as const,
        code: newCode,
        explanation,
        toolId: existing.id,
      };
    },
  });

  const updateDocumentTool = tool({
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
  });

  // 大工具時 updateCode 一律被拿掉 —— AI 看不到這個 tool，就只能走 editCode。
  // 參見 UPDATE_CODE_DISABLED_TOKEN_THRESHOLD 的說明。
  const result: {
    updateCode?: typeof updateCodeTool;
    editCode: typeof editCodeTool;
    updateDocument: typeof updateDocumentTool;
  } = {
    editCode: editCodeTool,
    updateDocument: updateDocumentTool,
  };
  if (!disableUpdateCode) {
    result.updateCode = updateCodeTool;
  }
  return result;
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
