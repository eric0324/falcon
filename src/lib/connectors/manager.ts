import { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BaseConnector } from "./base";
import { createConnector, hasConnector } from "./registry";
import {
  DataSourceType,
  DataSourceConfig,
  OperationResult,
  PermissionResult,
  ExecuteParams,
  QueryParams,
  ListParams,
  MutateParams,
} from "./types";
import { extractTableNames, filterBlockedColumns } from "./base";

export class ConnectorManager {
  private pool = new Map<string, BaseConnector>();
  private prismaClient: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prismaClient = prismaClient ?? prisma;
  }

  /**
   * Get or create a connector for a data source
   */
  async getConnector(dataSourceId: string): Promise<BaseConnector> {
    // Return cached connector if available
    if (this.pool.has(dataSourceId)) {
      return this.pool.get(dataSourceId)!;
    }

    // Fetch data source from database
    const ds = await this.prismaClient.dataSource.findUnique({
      where: { id: dataSourceId },
    });

    if (!ds) {
      throw new Error(`DataSource not found: ${dataSourceId}`);
    }

    if (!ds.isActive) {
      throw new Error(`DataSource is inactive: ${dataSourceId}`);
    }

    const dsType = ds.type as DataSourceType;

    // Check if connector type is registered
    if (!hasConnector(dsType)) {
      throw new Error(`Connector not registered for type: ${dsType}`);
    }

    // Create and connect
    const connector = createConnector(dsType, ds.config as unknown as DataSourceConfig);
    await connector.connect();

    // Cache the connector
    this.pool.set(dataSourceId, connector);

    return connector;
  }

  /**
   * Execute an operation with permission checking and audit logging
   */
  async execute(params: ExecuteParams): Promise<OperationResult> {
    const startTime = Date.now();

    try {
      // 1. Get connector
      const connector = await this.getConnector(params.dataSourceId);

      // 2. Check permissions
      const permission = await this.checkPermission(params);
      if (!permission.allowed) {
        const result: OperationResult = {
          success: false,
          error: permission.reason || "Permission denied",
        };
        await this.logOperation(params, result, Date.now() - startTime);
        return result;
      }

      // 3. Execute operation
      let result: OperationResult;
      try {
        result = await this.executeOperation(connector, params, permission);
      } catch (err) {
        result = {
          success: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }

      // 4. Log the operation
      result.duration = Date.now() - startTime;
      await this.logOperation(params, result, result.duration);

      return result;
    } catch (err) {
      const result: OperationResult = {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        duration: Date.now() - startTime,
      };
      await this.logOperation(params, result, result.duration ?? 0);
      return result;
    }
  }

  /**
   * Check if the user has permission to perform the operation
   */
  private async checkPermission(params: ExecuteParams): Promise<PermissionResult> {
    const permission = await this.prismaClient.dataSourcePermission.findUnique({
      where: {
        dataSourceId_department: {
          dataSourceId: params.dataSourceId,
          department: params.department,
        },
      },
    });

    if (!permission) {
      return {
        allowed: false,
        reason: "No permission for this data source",
      };
    }

    // Check operation-specific permissions
    switch (params.operation) {
      case "query":
      case "list": {
        // Check if user can read the requested tables
        if (params.sql) {
          const tables = extractTableNames(params.sql);
          const allowedTables = new Set(
            permission.readTables.map((t) => t.toLowerCase())
          );

          // If readTables is empty, all tables are allowed
          if (permission.readTables.length > 0) {
            const unauthorized = tables.filter(
              (t) => !allowedTables.has(t.toLowerCase())
            );
            if (unauthorized.length > 0) {
              return {
                allowed: false,
                reason: `Table not allowed: ${unauthorized.join(", ")}`,
              };
            }
          }
        }

        return {
          allowed: true,
          allowedTables: permission.readTables,
          blockedColumns: [
            ...permission.readBlockedColumns,
          ],
        };
      }

      case "create": {
        if (!params.resource) {
          return { allowed: false, reason: "Resource not specified" };
        }
        const canWrite = permission.writeTables.some(
          (t) => t.toLowerCase() === params.resource!.toLowerCase()
        );
        if (!canWrite) {
          return {
            allowed: false,
            reason: `Write not allowed for table: ${params.resource}`,
          };
        }
        return {
          allowed: true,
          blockedColumns: permission.writeBlockedColumns,
        };
      }

      case "update": {
        if (!params.resource) {
          return { allowed: false, reason: "Resource not specified" };
        }
        const canUpdate = permission.writeTables.some(
          (t) => t.toLowerCase() === params.resource!.toLowerCase()
        );
        if (!canUpdate) {
          return {
            allowed: false,
            reason: `Update not allowed for table: ${params.resource}`,
          };
        }
        return {
          allowed: true,
          blockedColumns: permission.writeBlockedColumns,
        };
      }

      case "delete": {
        if (!params.resource) {
          return { allowed: false, reason: "Resource not specified" };
        }
        const canDelete = permission.deleteTables.some(
          (t) => t.toLowerCase() === params.resource!.toLowerCase()
        );
        if (!canDelete) {
          return {
            allowed: false,
            reason: `Delete not allowed for table: ${params.resource}`,
          };
        }
        return { allowed: true };
      }

      default:
        return { allowed: false, reason: `Unknown operation: ${params.operation}` };
    }
  }

  /**
   * Execute the operation on the connector
   */
  private async executeOperation(
    connector: BaseConnector,
    params: ExecuteParams,
    permission: PermissionResult
  ): Promise<OperationResult> {
    const capabilities = connector.getCapabilities();

    switch (params.operation) {
      case "query": {
        if (!capabilities.canQuery || !connector.query) {
          return { success: false, error: "Query not supported" };
        }
        const queryParams: QueryParams = {
          sql: params.sql!,
          params: params.params,
          timeout: params.timeout,
          allowedTables: permission.allowedTables,
          blockedColumns: permission.blockedColumns,
        };
        return connector.query(queryParams);
      }

      case "list": {
        if (!capabilities.canList || !connector.list) {
          return { success: false, error: "List not supported" };
        }
        const listParams: ListParams = {
          resource: params.resource,
          filters: params.filters,
          limit: params.limit,
          offset: params.offset,
        };
        return connector.list(listParams);
      }

      case "create": {
        if (!capabilities.canCreate || !connector.create) {
          return { success: false, error: "Create not supported" };
        }
        // Filter out blocked columns from data
        const filteredData = this.filterBlockedData(
          params.data || {},
          permission.blockedColumns || []
        );
        const createParams: MutateParams = {
          resource: params.resource!,
          data: filteredData,
        };
        return connector.create(createParams);
      }

      case "update": {
        if (!capabilities.canUpdate || !connector.update) {
          return { success: false, error: "Update not supported" };
        }
        const filteredData = this.filterBlockedData(
          params.data || {},
          permission.blockedColumns || []
        );
        const updateParams: MutateParams = {
          resource: params.resource!,
          data: filteredData,
          where: params.where,
        };
        return connector.update(updateParams);
      }

      case "delete": {
        if (!capabilities.canDelete || !connector.delete) {
          return { success: false, error: "Delete not supported" };
        }
        const deleteParams: MutateParams = {
          resource: params.resource!,
          data: {},
          where: params.where,
        };
        return connector.delete(deleteParams);
      }

      default:
        return { success: false, error: `Unknown operation: ${params.operation}` };
    }
  }

  /**
   * Filter out blocked columns from data object
   */
  private filterBlockedData(
    data: Record<string, unknown>,
    blockedColumns: string[]
  ): Record<string, unknown> {
    if (blockedColumns.length === 0) return data;

    const blockedSet = new Set(blockedColumns.map((c) => c.toLowerCase()));
    const filtered: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      if (!blockedSet.has(key.toLowerCase())) {
        filtered[key] = value;
      }
    }

    return filtered;
  }

  /**
   * Log the operation to the audit log
   */
  private async logOperation(
    params: ExecuteParams,
    result: OperationResult,
    duration: number
  ): Promise<void> {
    try {
      await this.prismaClient.apiLog.create({
        data: {
          dataSourceId: params.dataSourceId,
          toolId: params.toolId || null,
          userId: params.userId,
          department: params.department,
          operation: params.operation,
          method: params.operation.toUpperCase(),
          query: params.sql || params.resource || null,
          params: params.params ? JSON.parse(JSON.stringify(params.params)) : null,
          success: result.success,
          errorMessage: result.error || null,
          rowCount: result.rowCount || null,
          duration,
        },
      });
    } catch (err) {
      // Log error but don't fail the operation
      console.error("Failed to log API operation:", err);
    }
  }

  /**
   * Disconnect and remove a connector from the pool
   */
  async removeConnector(dataSourceId: string): Promise<void> {
    const connector = this.pool.get(dataSourceId);
    if (connector) {
      await connector.disconnect();
      this.pool.delete(dataSourceId);
    }
  }

  /**
   * Disconnect all connectors
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.pool.values()).map((connector) =>
      connector.disconnect()
    );
    await Promise.all(disconnectPromises);
    this.pool.clear();
  }
}

// ===== Singleton Instance =====

let managerInstance: ConnectorManager | null = null;

/**
 * Get the singleton ConnectorManager instance
 */
export function getConnectorManager(): ConnectorManager {
  if (!managerInstance) {
    managerInstance = new ConnectorManager();
  }
  return managerInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetConnectorManager(): void {
  if (managerInstance) {
    managerInstance.disconnectAll();
    managerInstance = null;
  }
}
