const ASANA_API_BASE = "https://app.asana.com/api/1.0";

// ===== Types =====

export interface AsanaProject {
  id: string;
  name: string;
  status: string | null;
  dueOn: string | null;
  teamName: string | null;
}

export interface AsanaTaskSummary {
  id: string;
  name: string;
  assignee: string | null;
  dueOn: string | null;
  completed: boolean;
  subtaskCount: number;
  customFields: Array<{ name: string; value: string | null }>;
}

export interface AsanaSectionGroup {
  section: string;
  tasks: AsanaTaskSummary[];
}

export interface AsanaTaskDetail {
  id: string;
  name: string;
  notes: string;
  assignee: string | null;
  dueOn: string | null;
  completed: boolean;
  completedAt: string | null;
  customFields: Array<{ name: string; value: string | null }>;
  subtasks: Array<{ id: string; name: string; completed: boolean }>;
}

export interface AsanaComment {
  user: string;
  text: string;
  createdAt: string;
}

export interface AsanaSearchResult {
  id: string;
  name: string;
  assignee: string | null;
  completed: boolean;
  projectName: string | null;
}

// ===== Configuration =====

export function isAsanaConfigured(): boolean {
  return !!process.env.ASANA_PAT;
}

function getToken(): string {
  const token = process.env.ASANA_PAT;
  if (!token) throw new Error("ASANA_PAT is not configured");
  return token;
}

// ===== API Helper =====

async function asanaFetch<T>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = new URL(`${ASANA_API_BASE}${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Asana API error: ${response.status} ${error.errors?.[0]?.message || response.statusText}`
    );
  }

  return response.json();
}

// ===== Workspace =====

let cachedWorkspaceId: string | null = null;

async function getWorkspaceId(): Promise<string> {
  if (process.env.ASANA_WORKSPACE_ID) {
    return process.env.ASANA_WORKSPACE_ID;
  }

  if (cachedWorkspaceId) return cachedWorkspaceId;

  const result = await asanaFetch<{ data: Array<{ gid: string }> }>("/workspaces");
  if (!result.data.length) throw new Error("No Asana workspaces found");

  cachedWorkspaceId = result.data[0].gid;
  return cachedWorkspaceId;
}

// ===== API Functions =====

export async function listProjects(search?: string): Promise<AsanaProject[]> {
  const workspaceId = await getWorkspaceId();

  type ProjectRow = {
    gid: string;
    name: string;
    current_status_update: { title: string } | null;
    due_on: string | null;
    team: { name: string } | null;
    archived: boolean;
  };

  const allProjects: AsanaProject[] = [];
  let offset: string | undefined;
  const MAX_PAGES = 10;
  let page = 0;

  do {
    const params: Record<string, string> = {
      opt_fields: "name,current_status_update.title,due_on,team.name,archived",
      limit: "100",
    };
    if (offset) {
      params.offset = offset;
    }

    const result = await asanaFetch<{
      data: ProjectRow[];
      next_page: { offset: string } | null;
    }>(`/workspaces/${workspaceId}/projects`, params);

    const projects = result.data
      .filter((p) => !p.archived)
      .map((p) => ({
        id: p.gid,
        name: p.name,
        status: p.current_status_update?.title || null,
        dueOn: p.due_on,
        teamName: p.team?.name || null,
      }));

    allProjects.push(...projects);
    offset = result.next_page?.offset;
    page++;
  } while (offset && page < MAX_PAGES);

  if (search) {
    const q = search.toLowerCase();
    return allProjects.filter((p) => p.name.toLowerCase().includes(q));
  }

  return allProjects;
}

export async function getProjectTasks(
  projectId: string
): Promise<AsanaSectionGroup[]> {
  const result = await asanaFetch<{
    data: Array<{
      gid: string;
      name: string;
      assignee: { name: string } | null;
      due_on: string | null;
      completed: boolean;
      memberships: Array<{ section: { name: string } }>;
      num_subtasks: number;
      custom_fields: Array<{ name: string; display_value: string | null }>;
    }>;
  }>(`/projects/${projectId}/tasks`, {
    opt_fields:
      "name,assignee.name,due_on,completed,memberships.section.name,num_subtasks,custom_fields.name,custom_fields.display_value",
    limit: "100",
  });

  // Group by section
  const sectionMap = new Map<string, AsanaTaskSummary[]>();

  for (const task of result.data) {
    const sectionName =
      task.memberships?.[0]?.section?.name || "Uncategorized";
    const summary: AsanaTaskSummary = {
      id: task.gid,
      name: task.name,
      assignee: task.assignee?.name || null,
      dueOn: task.due_on,
      completed: task.completed,
      subtaskCount: task.num_subtasks || 0,
      customFields: (task.custom_fields || []).map((cf) => ({
        name: cf.name,
        value: cf.display_value,
      })),
    };

    if (!sectionMap.has(sectionName)) {
      sectionMap.set(sectionName, []);
    }
    sectionMap.get(sectionName)!.push(summary);
  }

  return Array.from(sectionMap.entries()).map(([section, tasks]) => ({
    section,
    tasks,
  }));
}

export async function getTask(taskId: string): Promise<AsanaTaskDetail> {
  const result = await asanaFetch<{
    data: {
      gid: string;
      name: string;
      notes: string;
      assignee: { name: string } | null;
      due_on: string | null;
      due_at: string | null;
      completed: boolean;
      completed_at: string | null;
      custom_fields: Array<{ name: string; display_value: string | null }>;
      num_subtasks: number;
    };
  }>(`/tasks/${taskId}`, {
    opt_fields:
      "name,notes,assignee.name,due_on,due_at,completed,completed_at,custom_fields.name,custom_fields.display_value,num_subtasks",
  });

  const task = result.data;

  // Fetch subtasks only if there are any
  let subtasks: Array<{ id: string; name: string; completed: boolean }> = [];
  if (task.num_subtasks > 0) {
    const subtaskResult = await asanaFetch<{
      data: Array<{ gid: string; name: string; completed: boolean }>;
    }>(`/tasks/${taskId}/subtasks`, {
      opt_fields: "name,completed",
    });
    subtasks = subtaskResult.data.map((s) => ({
      id: s.gid,
      name: s.name,
      completed: s.completed,
    }));
  }

  return {
    id: task.gid,
    name: task.name,
    notes: task.notes || "",
    assignee: task.assignee?.name || null,
    dueOn: task.due_on || task.due_at,
    completed: task.completed,
    completedAt: task.completed_at,
    customFields: (task.custom_fields || []).map((cf) => ({
      name: cf.name,
      value: cf.display_value,
    })),
    subtasks,
  };
}

export async function getTaskStories(taskId: string): Promise<AsanaComment[]> {
  const result = await asanaFetch<{
    data: Array<{
      gid: string;
      resource_subtype: string;
      text: string;
      created_at: string;
      created_by: { name: string };
    }>;
  }>(`/tasks/${taskId}/stories`, {
    opt_fields: "resource_subtype,text,created_at,created_by.name",
  });

  return result.data
    .filter((s) => s.resource_subtype === "comment_added")
    .map((s) => ({
      user: s.created_by?.name || "Unknown",
      text: s.text,
      createdAt: s.created_at,
    }));
}

export async function searchTasks(
  query: string,
  limit: number = 20
): Promise<AsanaSearchResult[]> {
  const workspaceId = await getWorkspaceId();

  const result = await asanaFetch<{
    data: Array<{
      gid: string;
      name: string;
      assignee: { name: string } | null;
      completed: boolean;
      projects: Array<{ name: string }>;
    }>;
  }>(`/workspaces/${workspaceId}/tasks/search`, {
    "text": query,
    "opt_fields": "name,assignee.name,completed,projects.name",
    "limit": String(limit),
  });

  return result.data.map((t) => ({
    id: t.gid,
    name: t.name,
    assignee: t.assignee?.name || null,
    completed: t.completed,
    projectName: t.projects?.[0]?.name || null,
  }));
}
