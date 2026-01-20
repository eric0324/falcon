import { Client } from "pg";
import {
  DatabaseConnector,
  DatabaseConfig,
  QueryResult,
  ConnectorOptions,
  extractTableNames,
  filterBlockedColumns,
} from "./base";

export class PostgresConnector implements DatabaseConnector {
  private client: Client;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.client = new Client({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
    });
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.end();
  }

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

  async query(
    sql: string,
    params: unknown[] = [],
    options: ConnectorOptions = {}
  ): Promise<QueryResult> {
    const { timeout = 5000, allowedTables = [], blockedColumns = [] } = options;

    // Validate tables if allowedTables is specified
    if (allowedTables.length > 0) {
      const validation = this.validateTables(sql, allowedTables);
      if (!validation.valid) {
        throw new Error(
          `Table not allowed: ${validation.invalidTables.join(", ")}`
        );
      }
    }

    // Only allow SELECT statements
    const normalizedSql = sql.trim().toLowerCase();
    if (!normalizedSql.startsWith("select")) {
      throw new Error("Only SELECT queries are allowed");
    }

    // Execute with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Query timeout")), timeout);
    });

    const queryPromise = this.client.query(sql, params);

    const result = await Promise.race([queryPromise, timeoutPromise]);

    // Filter blocked columns
    const filteredRows = filterBlockedColumns(
      result.rows as Record<string, unknown>[],
      blockedColumns
    );

    return {
      rows: filteredRows,
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
    const result = await connector.query(sql, params, options);
    return result;
  } finally {
    await connector.disconnect();
  }
}
