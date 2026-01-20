import mysql from "mysql2/promise";
import {
  DatabaseConnector,
  DatabaseConfig,
  QueryResult,
  ConnectorOptions,
  extractTableNames,
  filterBlockedColumns,
} from "./base";

export class MySQLConnector implements DatabaseConnector {
  private connection: mysql.Connection | null = null;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

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
    if (!this.connection) {
      throw new Error("Not connected to database");
    }

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

    const queryPromise = this.connection.execute(sql, params);

    const [rows] = await Promise.race([queryPromise, timeoutPromise]);

    // Filter blocked columns
    const rowArray = rows as Record<string, unknown>[];
    const filteredRows = filterBlockedColumns(rowArray, blockedColumns);

    return {
      rows: filteredRows,
      rowCount: filteredRows.length,
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
    const result = await connector.query(sql, params, options);
    return result;
  } finally {
    await connector.disconnect();
  }
}
