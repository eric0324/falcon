import { tool } from "ai";
import { z } from "zod";

// Tool: 更新程式碼
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

// Studio tools export
export const studioTools = {
  updateCode,
};
