import { prisma } from "./prisma";
import type { DataSource, DataSourcePermission } from "@prisma/client";

export interface ResolvedPermission {
  dataSource: DataSource;
  permission: DataSourcePermission | null;
  allowedTables: string[];
  blockedColumns: string[];
  canRead: boolean;
}

/**
 * Resolve permission for a user's department on a specific data source.
 * Falls back to "*" (default) permission if department-specific not found.
 */
export async function resolvePermission(
  dataSourceName: string,
  department: string | null | undefined
): Promise<ResolvedPermission | null> {
  const dataSource = await prisma.dataSource.findUnique({
    where: { name: dataSourceName },
    include: { permissions: true },
  });

  if (!dataSource || !dataSource.isActive) {
    return null;
  }

  // Find department-specific permission
  let permission = dataSource.permissions.find(
    (p) => p.department === department
  );

  // Fall back to default "*" permission
  if (!permission) {
    permission = dataSource.permissions.find((p) => p.department === "*");
  }

  // If no permission found at all, deny access
  if (!permission) {
    return {
      dataSource,
      permission: null,
      allowedTables: [],
      blockedColumns: dataSource.globalBlockedColumns,
      canRead: false,
    };
  }

  // Merge blocked columns (global + department)
  const blockedColumns = Array.from(
    new Set([
      ...dataSource.globalBlockedColumns,
      ...permission.readBlockedColumns,
    ])
  );

  return {
    dataSource,
    permission,
    allowedTables: permission.readTables,
    blockedColumns,
    canRead: permission.readTables.length > 0,
  };
}

/**
 * Check if a tool is authorized to use a data source.
 */
export function checkToolAuthorization(
  toolAllowedSources: string[],
  dataSourceName: string
): boolean {
  return toolAllowedSources.includes(dataSourceName);
}

/**
 * Get all data sources a user can access based on their department.
 */
export async function getAccessibleDataSources(
  department: string | null | undefined
): Promise<
  Array<{
    dataSource: DataSource;
    permission: DataSourcePermission;
    allowedTables: string[];
  }>
> {
  const dataSources = await prisma.dataSource.findMany({
    where: { isActive: true },
    include: { permissions: true },
  });

  const accessible: Array<{
    dataSource: DataSource;
    permission: DataSourcePermission;
    allowedTables: string[];
  }> = [];

  for (const ds of dataSources) {
    // Find department-specific permission
    let permission = ds.permissions.find((p) => p.department === department);

    // Fall back to default "*" permission
    if (!permission) {
      permission = ds.permissions.find((p) => p.department === "*");
    }

    if (permission && permission.readTables.length > 0) {
      accessible.push({
        dataSource: ds,
        permission,
        allowedTables: permission.readTables,
      });
    }
  }

  return accessible;
}
