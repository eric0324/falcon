import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/integrations/asana", () => ({
  isAsanaConfigured: vi.fn(() => true),
  listProjects: vi.fn(),
  getProjectTasks: vi.fn(),
  getTask: vi.fn(),
  getTaskStories: vi.fn(),
  searchTasks: vi.fn(),
}));

import { createAsanaTools } from "./asana-tools";
import {
  isAsanaConfigured,
  listProjects,
  getProjectTasks,
  getTask,
  getTaskStories,
  searchTasks,
} from "@/lib/integrations/asana";

const mockIsConfigured = vi.mocked(isAsanaConfigured);
const mockListProjects = vi.mocked(listProjects);
const mockGetProjectTasks = vi.mocked(getProjectTasks);
const mockGetTask = vi.mocked(getTask);
const mockGetTaskStories = vi.mocked(getTaskStories);
const mockSearchTasks = vi.mocked(searchTasks);

beforeEach(() => {
  vi.clearAllMocks();
  mockIsConfigured.mockReturnValue(true);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeTool(params: Record<string, unknown>): Promise<any> {
  const tools = createAsanaTools();
  return tools.asanaSearch.execute!(
    params as never,
    { toolCallId: "test", messages: [], abortSignal: undefined as never }
  );
}

describe("asanaSearch tool", () => {
  describe("not configured", () => {
    it("returns error when Asana is not configured", async () => {
      mockIsConfigured.mockReturnValue(false);
      const result = await executeTool({ action: "list" });
      expect(result.success).toBe(false);
      expect(result.needsConnection).toBe(true);
    });
  });

  describe("action: list", () => {
    it("lists projects", async () => {
      mockListProjects.mockResolvedValueOnce([
        { id: "P001", name: "Sprint 12", status: "On track", dueOn: "2026-03-01", teamName: "Product" },
      ]);

      const result = await executeTool({ action: "list" });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe("Sprint 12");
      expect(mockListProjects).toHaveBeenCalledWith(undefined);
    });

    it("passes search param to listProjects for name filtering", async () => {
      mockListProjects.mockResolvedValueOnce([
        { id: "P256", name: "Sprint 256", status: null, dueOn: null, teamName: null },
      ]);

      const result = await executeTool({ action: "list", search: "Sprint 256" });
      expect(result.success).toBe(true);
      expect(mockListProjects).toHaveBeenCalledWith("Sprint 256");
    });
  });

  describe("action: tasks", () => {
    it("gets project tasks grouped by section", async () => {
      mockGetProjectTasks.mockResolvedValueOnce([
        {
          section: "In Progress",
          tasks: [{ id: "T001", name: "Task 1", assignee: "Alice", dueOn: null, completed: false, subtaskCount: 0 }],
        },
      ]);

      const result = await executeTool({ action: "tasks", projectId: "P001" });
      expect(result.success).toBe(true);
      expect(result.data[0].section).toBe("In Progress");
      expect(mockGetProjectTasks).toHaveBeenCalledWith("P001");
    });
  });

  describe("action: read", () => {
    it("reads task details", async () => {
      mockGetTask.mockResolvedValueOnce({
        id: "T001",
        name: "Design mockup",
        notes: "Create mockups",
        assignee: "Alice",
        dueOn: "2026-02-15",
        completed: false,
        completedAt: null,
        customFields: [{ name: "Priority", value: "High" }],
        subtasks: [{ id: "ST001", name: "Mobile", completed: false }],
      });

      const result = await executeTool({ action: "read", taskId: "T001" });
      expect(result.success).toBe(true);
      expect(result.data.name).toBe("Design mockup");
      expect(result.data.subtasks).toHaveLength(1);
    });
  });

  describe("action: comments", () => {
    it("reads task comments", async () => {
      mockGetTaskStories.mockResolvedValueOnce([
        { user: "Alice", text: "Looks good!", createdAt: "2026-02-10T10:00:00.000Z" },
      ]);

      const result = await executeTool({ action: "comments", taskId: "T001" });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].user).toBe("Alice");
    });
  });

  describe("action: search", () => {
    it("searches tasks", async () => {
      mockSearchTasks.mockResolvedValueOnce([
        { id: "T001", name: "Fix bug", assignee: "Alice", completed: false, projectName: "Sprint 12" },
      ]);

      const result = await executeTool({ action: "search", search: "bug" });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockSearchTasks).toHaveBeenCalledWith("bug", 20);
    });
  });

  describe("default action", () => {
    it("defaults to list", async () => {
      mockListProjects.mockResolvedValueOnce([]);
      const result = await executeTool({});
      expect(result.success).toBe(true);
      expect(mockListProjects).toHaveBeenCalled();
    });
  });
});
