import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Tool: 更新程式碼（不需要資料來源限制）
export const updateCode = tool({
  description: "產生或更新 UI 程式碼。僅在使用者明確要求建立介面、工具、表格、圖表、儀表板時才使用。如果使用者只是問問題或查資料，不要呼叫此工具。",
  inputSchema: z.object({
    code: z.string().describe("完整的 React 元件程式碼（純 JavaScript/JSX，不要包含 ```jsx 等 markdown 標記）"),
    explanation: z.string().describe("簡短說明這次更新做了什麼（繁體中文）"),
  }),
  execute: async ({ code, explanation }) => {
    // 這個 tool 的結果會被前端攔截並更新 preview
    return {
      type: "code_update",
      code,
      explanation,
    };
  },
});

/**
 * 建立受限制的工具集
 * @param allowedDataSources 允許使用的資料來源名稱列表。空陣列表示不允許存取任何資料來源。
 */
export function createStudioTools(allowedDataSources: string[]) {
  // Tool: 列出可用的資料來源
  const listDataSources = tool({
    description: "列出使用者已選擇的可用資料來源",
    inputSchema: z.object({}),
    execute: async () => {
      // 如果沒有選擇任何資料來源
      if (allowedDataSources.length === 0) {
        return {
          error: "使用者尚未選擇任何資料來源。請告知使用者需要在輸入框下方的「資料來源」選擇器中選擇要使用的資料來源。",
          dataSources: [],
        };
      }

      const dataSources = await prisma.dataSource.findMany({
        where: {
          isActive: true,
          name: { in: allowedDataSources },
        },
        select: {
          id: true,
          name: true,
          displayName: true,
          type: true,
          description: true,
        },
      });

      if (dataSources.length === 0) {
        return {
          error: "找不到任何符合的資料來源，可能資料來源已被停用或刪除。",
          dataSources: [],
        };
      }

      return { dataSources };
    },
  });

  // Tool: 取得資料來源的 schema
  const getDataSourceSchema = tool({
    description: "取得資料來源的 table 和 column 結構，用來了解可以查詢哪些資料",
    inputSchema: z.object({
      dataSourceId: z.string().describe("資料來源的 ID 或名稱"),
    }),
    execute: async ({ dataSourceId }) => {
      // 檢查是否在允許的資料來源列表中
      if (allowedDataSources.length === 0) {
        return {
          error: "使用者尚未選擇任何資料來源。請告知使用者需要先選擇資料來源才能查看結構。",
        };
      }

      // 查詢資料來源，同時檢查是否在允許列表中
      const dataSource = await prisma.dataSource.findFirst({
        where: {
          OR: [{ id: dataSourceId }, { name: dataSourceId }],
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          displayName: true,
          type: true,
          schema: true,
        },
      });

      if (!dataSource) {
        return { error: `找不到資料來源: ${dataSourceId}` };
      }

      // 檢查是否在允許的列表中
      if (!allowedDataSources.includes(dataSource.name)) {
        return {
          error: `資料來源「${dataSource.displayName}」未被使用者選擇。請告知使用者需要在輸入框下方的「資料來源」選擇器中勾選此資料來源。`,
          availableDataSources: allowedDataSources,
        };
      }

      return {
        id: dataSource.id,
        name: dataSource.name,
        displayName: dataSource.displayName,
        type: dataSource.type,
        schema: dataSource.schema,
      };
    },
  });

  // Tool: 查詢範例資料
  const querySampleData = tool({
    description: "查詢資料來源的範例資料（限 5 筆），用來了解資料的實際內容和格式",
    inputSchema: z.object({
      dataSourceId: z.string().describe("資料來源的 ID 或名稱"),
      table: z.string().describe("要查詢的 table 名稱"),
    }),
    execute: async ({ dataSourceId, table }) => {
      // 檢查是否在允許的資料來源列表中
      if (allowedDataSources.length === 0) {
        return {
          error: "使用者尚未選擇任何資料來源。請告知使用者需要先選擇資料來源才能查詢資料。",
        };
      }

      // 先檢查資料來源是否存在和被允許
      const dataSource = await prisma.dataSource.findFirst({
        where: {
          OR: [{ id: dataSourceId }, { name: dataSourceId }],
          isActive: true,
        },
        select: {
          name: true,
          displayName: true,
        },
      });

      if (!dataSource) {
        return { error: `找不到資料來源: ${dataSourceId}` };
      }

      if (!allowedDataSources.includes(dataSource.name)) {
        return {
          error: `資料來源「${dataSource.displayName}」未被使用者選擇。請告知使用者需要在輸入框下方的「資料來源」選擇器中勾選此資料來源。`,
          availableDataSources: allowedDataSources,
        };
      }

      // 這裡需要實際執行 SQL 查詢
      // 暫時回傳模擬資料，之後整合 API Bridge
      return {
        message: `查詢 ${dataSourceId} 的 ${table} 表範例資料`,
        note: "此功能需要整合 API Bridge，目前回傳模擬結果",
        sampleData: [
          { id: 1, note: "這是模擬資料，實際功能待實作" },
        ],
      };
    },
  });

  return {
    listDataSources,
    getDataSourceSchema,
    querySampleData,
    updateCode,
  };
}

// 保留原始匯出供向下相容（無限制版本）
export const studioTools = createStudioTools([]);
