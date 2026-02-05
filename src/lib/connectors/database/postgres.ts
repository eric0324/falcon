import { Client } from "pg";
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

export class PostgresConnector implements BaseConnector {
  private client: Client | null = null;
  private config: DatabaseConfig;

  constructor(config: DataSourceConfig) {
    this.config = config as DatabaseConfig;
  }

  // ===== BaseConnector Implementation =====

  async connect(): Promise<void> {
    this.client = new Client({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
    });
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const wasConnected = this.client !== null;
      if (!wasConnected) {
        await this.connect();
      }
      await this.client!.query("SELECT 1");
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
    if (!this.client) {
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

      const queryPromise = this.client.query(sql, queryParams as unknown[]);
      const result = await Promise.race([queryPromise, timeoutPromise]);

      // Filter blocked columns
      const filteredRows = filterBlockedColumns(
        result.rows as Record<string, unknown>[],
        blockedColumns
      );

      return {
        success: true,
        data: filteredRows,
        rowCount: result.rowCount || 0,
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
    const sql = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    return this.query({ sql });
  }

  async getSchema(): Promise<SchemaInfo> {
    if (!this.client) {
      throw new Error("Not connected to database");
    }

    const tablesResult = await this.client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const tables = [];

    for (const row of tablesResult.rows) {
      const tableName = row.table_name;
      const columnsResult = await this.client.query(
        `
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `,
        [tableName]
      );

      // Get primary key columns
      const pkResult = await this.client.query(
        `
        SELECT a.attname
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = $1::regclass AND i.indisprimary
      `,
        [tableName]
      );
      const pkColumns = new Set(pkResult.rows.map((r) => r.attname));

      tables.push({
        name: tableName,
        columns: columnsResult.rows.map((col) => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === "YES",
          primaryKey: pkColumns.has(col.column_name),
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
export async function executePostgresQuery(
  config: DatabaseConfig,
  sql: string,
  params: unknown[] = [],
  options: ConnectorOptions = {}
): Promise<QueryResult> {
  const connector = new PostgresConnector(config);

  try {
    await connector.connect();
    const result = await connector.legacyQuery(sql, params, options);
    return result;
  } finally {
    await connector.disconnect();
  }
}
