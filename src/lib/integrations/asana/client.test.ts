import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const originalEnv = process.env;

beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

async function importClient() {
  return import("./client");
}

describe("isAsanaConfigured", () => {
  it("returns true when ASANA_PAT is set", async () => {
    process.env.ASANA_PAT = "1/test-pat";
    const { isAsanaConfigured } = await importClient();
    expect(isAsanaConfigured()).toBe(true);
  });

  it("returns false when ASANA_PAT is not set", async () => {
    delete process.env.ASANA_PAT;
    const { isAsanaConfigured } = await importClient();
    expect(isAsanaConfigured()).toBe(false);
  });
});

describe("Asana API functions", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    process.env.ASANA_PAT = "1/test-pat";
    global.fetch = mockFetch;
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper: mock a workspace response (first call for most functions)
  function mockWorkspaceResponse() {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ gid: "W001", name: "My Workspace" }],
      }),
    });
  }

  describe("listProjects", () => {
    it("returns non-archived projects", async () => {
      mockWorkspaceResponse();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              gid: "P001",
              name: "Product Launch",
              current_status_update: { title: "On track" },
              due_on: "2026-03-01",
              team: { name: "Product" },
              archived: false,
            },
            {
              gid: "P002",
              name: "Old Project",
              current_status_update: null,
              due_on: null,
              team: null,
              archived: true,
            },
          ],
          next_page: null,
        }),
      });

      const { listProjects } = await importClient();
      const result = await listProjects();

      // Should filter out archived
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: "P001",
        name: "Product Launch",
        status: "On track",
        dueOn: "2026-03-01",
        teamName: "Product",
      });

      // Verify auth header
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("projects"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer 1/test-pat",
          }),
        })
      );
    });

    it("paginates through multiple pages", async () => {
      mockWorkspaceResponse();
      // Page 1
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { gid: "P001", name: "Sprint 1", current_status_update: null, due_on: null, team: null, archived: false },
          ],
          next_page: { offset: "page2_offset" },
        }),
      });
      // Page 2
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { gid: "P256", name: "Sprint 256", current_status_update: null, due_on: null, team: null, archived: false },
          ],
          next_page: null,
        }),
      });

      const { listProjects } = await importClient();
      const result = await listProjects();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Sprint 1");
      expect(result[1].name).toBe("Sprint 256");

      // Should have called workspace + 2 pages
      expect(mockFetch).toHaveBeenCalledTimes(3);
      // Second page should include offset param
      const secondPageUrl = mockFetch.mock.calls[2][0] as string;
      expect(secondPageUrl).toContain("offset=page2_offset");
    });

    it("filters by name when search is provided", async () => {
      mockWorkspaceResponse();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { gid: "P001", name: "Sprint 1", current_status_update: null, due_on: null, team: null, archived: false },
            { gid: "P002", name: "Product Launch", current_status_update: null, due_on: null, team: null, archived: false },
            { gid: "P003", name: "Sprint 256", current_status_update: null, due_on: null, team: null, archived: false },
          ],
          next_page: null,
        }),
      });

      const { listProjects } = await importClient();
      const result = await listProjects("sprint");

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Sprint 1");
      expect(result[1].name).toBe("Sprint 256");
    });
  });

  describe("getProjectTasks", () => {
    it("returns tasks grouped by section with custom fields", async () => {
      // tasks endpoint
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              gid: "T001",
              name: "Design mockup",
              assignee: { name: "Alice" },
              due_on: "2026-02-15",
              completed: false,
              memberships: [{ section: { name: "In Progress" } }],
              num_subtasks: 0,
              custom_fields: [
                { name: "Cost", display_value: "5" },
                { name: "Type", display_value: "Design" },
              ],
            },
            {
              gid: "T002",
              name: "Write spec",
              assignee: null,
              due_on: null,
              completed: true,
              memberships: [{ section: { name: "Done" } }],
              num_subtasks: 2,
              custom_fields: [
                { name: "Cost", display_value: "3" },
              ],
            },
          ],
        }),
      });

      const { getProjectTasks } = await importClient();
      const result = await getProjectTasks("P001");

      expect(result).toHaveLength(2);

      const inProgress = result.find((s) => s.section === "In Progress");
      expect(inProgress).toBeDefined();
      expect(inProgress!.tasks).toHaveLength(1);
      expect(inProgress!.tasks[0]).toEqual({
        id: "T001",
        name: "Design mockup",
        assignee: "Alice",
        dueOn: "2026-02-15",
        completed: false,
        subtaskCount: 0,
        customFields: [
          { name: "Cost", value: "5" },
          { name: "Type", value: "Design" },
        ],
      });

      const done = result.find((s) => s.section === "Done");
      expect(done).toBeDefined();
      expect(done!.tasks[0].completed).toBe(true);
      expect(done!.tasks[0].customFields).toEqual([
        { name: "Cost", value: "3" },
      ]);
    });
  });

  describe("getTask", () => {
    it("returns task details with subtasks", async () => {
      // task detail
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            gid: "T001",
            name: "Design mockup",
            notes: "Create high-fidelity mockups",
            assignee: { name: "Alice" },
            due_on: "2026-02-15",
            due_at: null,
            completed: false,
            completed_at: null,
            custom_fields: [
              { name: "Priority", display_value: "High" },
            ],
            num_subtasks: 2,
          },
        }),
      });

      // subtasks
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { gid: "ST001", name: "Mobile mockup", completed: false },
            { gid: "ST002", name: "Desktop mockup", completed: true },
          ],
        }),
      });

      const { getTask } = await importClient();
      const result = await getTask("T001");

      expect(result.name).toBe("Design mockup");
      expect(result.notes).toBe("Create high-fidelity mockups");
      expect(result.assignee).toBe("Alice");
      expect(result.customFields).toEqual([{ name: "Priority", value: "High" }]);
      expect(result.subtasks).toHaveLength(2);
      expect(result.subtasks[0]).toEqual({
        id: "ST001",
        name: "Mobile mockup",
        completed: false,
      });
    });

    it("returns empty subtasks when num_subtasks is 0", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            gid: "T001",
            name: "Simple task",
            notes: "",
            assignee: null,
            due_on: null,
            due_at: null,
            completed: false,
            completed_at: null,
            custom_fields: [],
            num_subtasks: 0,
          },
        }),
      });

      const { getTask } = await importClient();
      const result = await getTask("T001");

      expect(result.subtasks).toEqual([]);
      // Should not call subtasks endpoint
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("getTaskStories", () => {
    it("returns only comment stories, filtering system activity", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              gid: "S001",
              resource_subtype: "comment_added",
              text: "Looks good, let's proceed!",
              created_at: "2026-02-10T10:00:00.000Z",
              created_by: { name: "Alice" },
            },
            {
              gid: "S002",
              resource_subtype: "added_to_project",
              text: "",
              created_at: "2026-02-10T09:00:00.000Z",
              created_by: { name: "System" },
            },
            {
              gid: "S003",
              resource_subtype: "comment_added",
              text: "I have some concerns about the timeline",
              created_at: "2026-02-10T11:00:00.000Z",
              created_by: { name: "Bob" },
            },
          ],
        }),
      });

      const { getTaskStories } = await importClient();
      const result = await getTaskStories("T001");

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        user: "Alice",
        text: "Looks good, let's proceed!",
        createdAt: "2026-02-10T10:00:00.000Z",
      });
      expect(result[1].user).toBe("Bob");
    });
  });

  describe("searchTasks", () => {
    it("searches tasks in workspace", async () => {
      mockWorkspaceResponse();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              gid: "T001",
              name: "Fix login bug",
              assignee: { name: "Alice" },
              completed: false,
              projects: [{ name: "Sprint 12" }],
            },
          ],
        }),
      });

      const { searchTasks } = await importClient();
      const result = await searchTasks("login bug");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: "T001",
        name: "Fix login bug",
        assignee: "Alice",
        completed: false,
        projectName: "Sprint 12",
      });

      // Verify search endpoint called
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("tasks/search"),
        expect.anything()
      );
    });

    it("returns empty array when no results", async () => {
      mockWorkspaceResponse();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const { searchTasks } = await importClient();
      const result = await searchTasks("nonexistent");

      expect(result).toHaveLength(0);
    });
  });
});
