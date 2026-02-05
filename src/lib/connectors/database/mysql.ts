import mysql from "mysql2/promise";
import {
  BaseConnector,
  ConnectorCapabilities,
  QueryParams,
  ListParams,
  OperationResult,
  SchemaInfo,
  DatabaseConfig,
  DataSourceConfig,
  // Legacy exports for backward compatibility
  DatabaseConnector,
  QueryResult,
  ConnectorOptions,
  extractTableNames,
  filterBlockedColumns,
} from "../base";

export class MySQLConnector implements BaseConnector {
  private connection: mysql.Connection | null = null;
  private config: DatabaseConfig;

  constructor(config: DataSourceConfig) {
    this.config = config as DatabaseConfig;
  }

  // ===== BaseConnector Implementation =====

  async connect(): Promise<void> {
    this.connection = await mysql.createConnection({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
    });
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const wasConnected = this.connection !== null;
      if (!wasConnected) {
        await this.connect();
      }
      await this.connection!.query("SELECT 1");
      if (!wasConnected) {
        await this.disconnect();
      }
      return true;
    } catch {
      return false;
    }
  }

  getCapabilities(): ConnectorCapabilities {
    return {
      canQuery: true,
      canList: true,
      canCreate: false, // Currently only SELECT is allowed
      canUpdate: false,
      canDelete: false,
    };
  }

  async query(params: QueryParams): Promise<OperationResult> {
    if (!this.connection) {
      return { success: false, error: "Not connected to database" };
    }

    const {
      sql,
      params: queryParams = [],
      timeout = 5000,
      allowedTables = [],
      blockedColumns = [],
    } = params;

    // Validate tables if allowedTables is specified
    if (allowedTables.length > 0) {
      const validation = this.validateTables(sql, allowedTables);
      if (!validation.valid) {
        return {
          success: false,
          error: `Table not allowed: ${validation.invalidTables.join(", ")}`,
        };
      }
    }

    // Only allow SELECT statements
    const normalizedSql = sql.trim().toLowerCase();
    if (!normalizedSql.startsWith("select")) {
      return { success: false, error: "Only SELECT queries are allowed" };
    }

    try {
      // Execute with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Query timeout")), timeout);
      });

      const queryPromise = this.connection.execute(sql, queryParams as unknown[]);
      const [rows] = await Promise.race([queryPromise, timeoutPromise]);

      // Filter blocked columns
      const rowArray = rows as Record<string, unknown>[];
      const filteredRows = filterBlockedColumns(rowArray, blockedColumns);

      return {
        success: true,
        data: filteredRows,
        rowCount: filteredRows.length,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async list(params: ListParams): Promise<OperationResult> {
    const { resource, limit = 100, offset = 0 } = params;

    if (resource) {
      // List rows from a specific table
      const sql = `SELECT * FROM ${resource} LIMIT ${limit} OFFSET ${offset}`;
      return this.query({ sql });
    }

    // List all tables
    const sql = `SHOW TABLES`;
    return this.query({ sql });
  }

  async getSchema(): Promise<SchemaInfo> {
    if (!this.connection) {
      throw new Error("Not connected to database");
    }

    const [tablesResult] = await this.connection.query(`SHOW TABLES`);
    const tables = [];

    for (const row of tablesResult as Record<string, unknown>[]) {
      const tableName = Object.values(row)[0] as string;
      const [columnsResult] = await this.connection.query(
        `DESCRIBE ${tableName}`
      );

      tables.push({
        name: tableName,
        columns: (columnsResult as Record<string, unknown>[]).map((col) => ({
          name: col.Field as string,
          type: col.Type as string,
          nullable: col.Null === "YES",
          primaryKey: col.Key === "PRI",
        })),
      });
    }

    return { tables };
  }

  // ===== Legacy DatabaseConnector Implementation =====

  validateTables(
    sql: string,
    allowedTables: string[]
  ): { valid: boolean; invalidTables: string[] } {
    const tables = extractTableNames(sql);
    const allowedSet = new Set(allowedTables.map((t) => t.toLowerCase()));
    const invalidTables = tables.filter((t) => !allowedSet.has(t.toLowerCase()));

    return {
      valid: invalidTables.length === 0,
      invalidTables,
    };
  }

  // Legacy query method (backward compatible)
  async legacyQuery(
    sql: string,
    params: unknown[] = [],
    options: ConnectorOptions = {}
  ): Promise<QueryResult> {
    const result = await this.query({
      sql,
      params,
      timeout: options.timeout,
      allowedTables: options.allowedTables,
      blockedColumns: options.blockedColumns,
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    return {
      rows: result.data as Record<string, unknown>[],
      rowCount: result.rowCount || 0,
    };
  }
}

// Factory function to create a one-time query connection
export async function executeMySQLQuery(
  config: DatabaseConfig,
  sql: string,
  params: unknown[] = [],
  options: ConnectorOptions = {}
): Promise<QueryResult> {
  const connector = new MySQLConnector(config);

  try {
    await connector.connect();
    const result = await connector.legacyQuery(sql, params, options);
    return result;
  } finally {
    await connector.disconnect();
  }
}
