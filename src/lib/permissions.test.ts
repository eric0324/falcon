import { describe, it, expect, vi, beforeEach } from "vitest";

// Create prisma mock with vi.hoisted + vi.fn() to avoid hoisting issues
const prismaMock = vi.hoisted(() => ({
  dataSource: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import {
  checkToolAuthorization,
  resolvePermission,
  getAccessibleDataSources,
} from "./permissions";

describe("checkToolAuthorization", () => {
  it("returns true when source is in allowed list", () => {
    expect(checkToolAuthorization(["db-main", "api-hr"], "db-main")).toBe(true);
  });

  it("returns false when source is not in allowed list", () => {
    expect(checkToolAuthorization(["db-main", "api-hr"], "db-secret")).toBe(false);
  });

  it("returns false for empty allowed list", () => {
    expect(checkToolAuthorization([], "db-main")).toBe(false);
  });
});

describe("resolvePermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when dataSource not found", async () => {
    prismaMock.dataSource.findUnique.mockResolvedValue(null);
    const result = await resolvePermission("nonexistent", "engineering");
    expect(result).toBeNull();
  });

  it("returns null when dataSource is inactive", async () => {
    prismaMock.dataSource.findUnique.mockResolvedValue({
      id: "ds-1",
      name: "db-main",
      displayName: "Main DB",
      type: "POSTGRES",
      isActive: false,
      permissions: [],
      globalBlockedColumns: [],
    });
    const result = await resolvePermission("db-main", "engineering");
    expect(result).toBeNull();
  });

  it("resolves department-specific permission", async () => {
    const permission = {
      id: "perm-1",
      dataSourceId: "ds-1",
      department: "engineering",
      readTables: ["users", "orders"],
      readBlockedColumns: ["salary"],
    };

    prismaMock.dataSource.findUnique.mockResolvedValue({
      id: "ds-1",
      name: "db-main",
      displayName: "Main DB",
      type: "POSTGRES",
      isActive: true,
      globalBlockedColumns: ["ssn"],
      permissions: [
        permission,
        { id: "perm-2", department: "*", readTables: ["users"], readBlockedColumns: [] },
      ],
    });

    const result = await resolvePermission("db-main", "engineering");
    expect(result).not.toBeNull();
    expect(result!.permission).toEqual(permission);
    expect(result!.allowedTables).toEqual(["users", "orders"]);
    expect(result!.blockedColumns).toEqual(expect.arrayContaining(["ssn", "salary"]));
    expect(result!.canRead).toBe(true);
  });

  it("falls back to * permission when department not found", async () => {
    const defaultPerm = {
      id: "perm-2",
      dataSourceId: "ds-1",
      department: "*",
      readTables: ["users"],
      readBlockedColumns: [],
    };

    prismaMock.dataSource.findUnique.mockResolvedValue({
      id: "ds-1",
      name: "db-main",
      displayName: "Main DB",
      type: "POSTGRES",
      isActive: true,
      globalBlockedColumns: [],
      permissions: [defaultPerm],
    });

    const result = await resolvePermission("db-main", "unknown-dept");
    expect(result).not.toBeNull();
    expect(result!.permission).toEqual(defaultPerm);
    expect(result!.allowedTables).toEqual(["users"]);
  });

  it("denies access when no permission found", async () => {
    prismaMock.dataSource.findUnique.mockResolvedValue({
      id: "ds-1",
      name: "db-main",
      displayName: "Main DB",
      type: "POSTGRES",
      isActive: true,
      globalBlockedColumns: ["ssn"],
      permissions: [],
    });

    const result = await resolvePermission("db-main", "engineering");
    expect(result).not.toBeNull();
    expect(result!.canRead).toBe(false);
    expect(result!.permission).toBeNull();
    expect(result!.blockedColumns).toEqual(["ssn"]);
  });
});

describe("getAccessibleDataSources", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns accessible data sources for a department", async () => {
    prismaMock.dataSource.findMany.mockResolvedValue([
      {
        id: "ds-1",
        name: "db-main",
        displayName: "Main DB",
        type: "POSTGRES",
        isActive: true,
        permissions: [
          {
            id: "perm-1",
            department: "engineering",
            readTables: ["users", "orders"],
            readBlockedColumns: [],
          },
        ],
      },
      {
        id: "ds-2",
        name: "db-hr",
        displayName: "HR DB",
        type: "POSTGRES",
        isActive: true,
        permissions: [
          {
            id: "perm-2",
            department: "hr",
            readTables: ["employees"],
            readBlockedColumns: [],
          },
        ],
      },
    ]);

    const result = await getAccessibleDataSources("engineering");
    expect(result).toHaveLength(1);
    expect(result[0].dataSource.name).toBe("db-main");
    expect(result[0].allowedTables).toEqual(["users", "orders"]);
  });

  it("falls back to * permission", async () => {
    prismaMock.dataSource.findMany.mockResolvedValue([
      {
        id: "ds-1",
        name: "db-main",
        displayName: "Main DB",
        type: "POSTGRES",
        isActive: true,
        permissions: [
          {
            id: "perm-1",
            department: "*",
            readTables: ["products"],
            readBlockedColumns: [],
          },
        ],
      },
    ]);

    const result = await getAccessibleDataSources("any-dept");
    expect(result).toHaveLength(1);
    expect(result[0].allowedTables).toEqual(["products"]);
  });

  it("excludes sources with no matching permission", async () => {
    prismaMock.dataSource.findMany.mockResolvedValue([
      {
        id: "ds-1",
        name: "db-main",
        displayName: "Main DB",
        type: "POSTGRES",
        isActive: true,
        permissions: [
          {
            id: "perm-1",
            department: "hr",
            readTables: ["employees"],
            readBlockedColumns: [],
          },
        ],
      },
    ]);

    const result = await getAccessibleDataSources("engineering");
    expect(result).toHaveLength(0);
  });

  it("excludes sources with empty readTables", async () => {
    prismaMock.dataSource.findMany.mockResolvedValue([
      {
        id: "ds-1",
        name: "db-main",
        displayName: "Main DB",
        type: "POSTGRES",
        isActive: true,
        permissions: [
          {
            id: "perm-1",
            department: "*",
            readTables: [],
            readBlockedColumns: [],
          },
        ],
      },
    ]);

    const result = await getAccessibleDataSources("engineering");
    expect(result).toHaveLength(0);
  });
});
