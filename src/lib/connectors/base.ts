export interface QueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export interface RestApiConfig {
  baseUrl: string;
  headers: Record<string, string>;
}

export interface ConnectorOptions {
  timeout?: number; // milliseconds
  allowedTables?: string[];
  blockedColumns?: string[];
}

export interface DatabaseConnector {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  query(sql: string, params?: unknown[], options?: ConnectorOptions): Promise<QueryResult>;
  validateTables(sql: string, allowedTables: string[]): { valid: boolean; invalidTables: string[] };
}

export interface RestApiConnector {
  call(endpoint: string, data?: unknown): Promise<unknown>;
}

// Extract table names from SQL query (simple parser)
export function extractTableNames(sql: string): string[] {
  const tables: string[] = [];
  const normalizedSql = sql.replace(/\s+/g, " ").toLowerCase();

  // Match FROM clause
  const fromMatch = normalizedSql.match(/from\s+([a-z_][a-z0-9_]*)/g);
  if (fromMatch) {
    for (const match of fromMatch) {
      const tableName = match.replace(/from\s+/, "");
      if (!tables.includes(tableName)) {
        tables.push(tableName);
      }
    }
  }

  // Match JOIN clauses
  const joinMatch = normalizedSql.match(/join\s+([a-z_][a-z0-9_]*)/g);
  if (joinMatch) {
    for (const match of joinMatch) {
      const tableName = match.replace(/join\s+/, "");
      if (!tables.includes(tableName)) {
        tables.push(tableName);
      }
    }
  }

  return tables;
}

// Filter blocked columns from result rows
export function filterBlockedColumns(
  rows: Record<string, unknown>[],
  blockedColumns: string[]
): Record<string, unknown>[] {
  if (blockedColumns.length === 0) return rows;

  const blockedSet = new Set(blockedColumns.map((c) => c.toLowerCase()));

  return rows.map((row) => {
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (!blockedSet.has(key.toLowerCase())) {
        filtered[key] = value;
      }
    }
    return filtered;
  });
}
