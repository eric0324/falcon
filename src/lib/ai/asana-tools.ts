import { tool } from "ai";
import { z } from "zod";
import {
  isAsanaConfigured,
  listProjects,
  getProjectTasks,
  getTask,
  getTaskStories,
  searchTasks,
} from "@/lib/integrations/asana";

export function createAsanaTools() {
  return {
    asanaSearch: tool({
      description: `存取 Asana 專案管理資料（唯讀）。善用平行呼叫同時讀取多筆資料。

操作：
- list：列出所有專案（可用 search 過濾專案名稱）
- tasks：列出專案的任務（按 section 分組，用 projectId）
- read：讀取任務詳情與子任務（用 taskId）
- comments：讀取任務留言（用 taskId）
- search：搜尋任務（用 search 關鍵字）`,
      inputSchema: z.object({
        action: z.enum(["list", "tasks", "read", "comments", "search"]).optional()
          .describe("list: 列出專案, tasks: 專案任務, read: 任務詳情, comments: 任務留言, search: 搜尋。預設為 list"),
        projectId: z.string().optional().describe("專案 ID（用於 tasks）"),
        taskId: z.string().optional().describe("任務 ID（用於 read 和 comments）"),
        search: z.string().optional().describe("搜尋關鍵字（用於 search 和 list 過濾專案名稱）"),
        limit: z.number().optional().describe("最多返回幾筆結果，預設 20"),
      }),
      execute: async (params) => {
        const { action, projectId, taskId, search, limit = 20 } = params;

        try {
          if (!isAsanaConfigured()) {
            return {
              success: false,
              error: "Asana 尚未設定。請在環境變數中設定 ASANA_PAT。",
              needsConnection: true,
              service: "asana",
            };
          }

          if (action === "tasks" && projectId) {
            const data = await getProjectTasks(projectId);
            const totalTasks = data.reduce((sum, s) => sum + s.tasks.length, 0);
            return {
              success: true,
              service: "asana",
              data,
              rowCount: totalTasks,
              hint: "用 read(taskId) 看任務詳情，comments(taskId) 看留言。subtaskCount > 0 的任務有子任務。",
            };
          }

          if (action === "read" && taskId) {
            const data = await getTask(taskId);
            return {
              success: true,
              service: "asana",
              data,
              hint: "用 comments(taskId) 看這個任務的留言討論。",
            };
          }

          if (action === "comments" && taskId) {
            const data = await getTaskStories(taskId);
            return {
              success: true,
              service: "asana",
              data,
              rowCount: data.length,
            };
          }

          if (action === "search" && search) {
            const data = await searchTasks(search, limit);
            return {
              success: true,
              service: "asana",
              data,
              rowCount: data.length,
              hint: "用 read(taskId) 看任務詳情，tasks(projectId) 看整個專案。",
            };
          }

          // Default: list projects (with optional name filter)
          const data = await listProjects(search);
          return {
            success: true,
            service: "asana",
            data,
            rowCount: data.length,
            hint: search
              ? "用 tasks(projectId) 列出專案任務。"
              : "用 tasks(projectId) 列出專案任務，search(關鍵字) 搜尋任務，或 list + search 過濾專案名稱。",
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            service: "asana",
          };
        }
      },
    }),
  };
}
