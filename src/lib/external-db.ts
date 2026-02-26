import mysql from "mysql2/promise";
import pg from "pg";

export interface DbConnectionConfig {
  type: "POSTGRESQL" | "MYSQL";
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  sslEnabled: boolean;
}

export interface IntrospectedColumn {
  columnName: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
}

export interface IntrospectedTable {
  tableName: string;
  columns: IntrospectedColumn[];
}

async function withPgClient<T>(
  config: DbConnectionConfig,
  fn: (client: pg.Client) => Promise<T>
): Promise<T> {
  const client = new pg.Client({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.username,
    password: config.password,
    ssl: config.sslEnabled ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10_000,
  });
  try {
    await client.connect();
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function withMysqlConnection<T>(
  config: DbConnectionConfig,
  fn: (conn: mysql.Connection) => Promise<T>
): Promise<T> {
  const conn = await mysql.createConnection({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.username,
    password: config.password,
    ssl: config.sslEnabled ? { rejectUnauthorized: false } : undefined,
    connectTimeout: 10_000,
  });
  try {
    return await fn(conn);
  } finally {
    await conn.end();
  }
}

const MAX_ROWS = 1000;
const QUERY_TIMEOUT_MS = 30_000;
const MAX_CELL_LENGTH = 500;

const FORBIDDEN_PATTERN = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|EXEC|EXECUTE)\b/i;

const SYSTEM_SCHEMAS = [
  "information_schema",
  "pg_catalog",
  "pg_shadow",
  "pg_authid",
  "pg_roles",
  "pg_user",
  "mysql",
  "performance_schema",
  "sys",
];

export function validateSelectOnly(sql: string): void {
  const trimmed = sql.trim();
  if (!/^(SELECT|WITH)\b/i.test(trimmed)) {
    throw new Error("只允許 SELECT 查詢");
  }
  if (FORBIDDEN_PATTERN.test(trimmed)) {
    throw new Error("只允許 SELECT 查詢");
  }
}

/**
 * Extract table names referenced in SQL (FROM / JOIN clauses).
 * Handles: `FROM table`, `FROM schema.table`, `JOIN table`, `FROM table alias`
 * Does not handle all edge cases but covers typical LLM-generated SQL.
 */
export function extractTableNames(sql: string): string[] {
  const names: string[] = [];
  // Match FROM/JOIN followed by optional schema.table or just table
  const pattern = /\b(?:FROM|JOIN)\s+([`"']?[\w.*]+[`"']?(?:\s*\.\s*[`"']?[\w*]+[`"']?)?)/gi;
  let match;
  while ((match = pattern.exec(sql)) !== null) {
    const raw = match[1].replace(/[`"']/g, "").trim();
    names.push(raw.toLowerCase());
  }
  return names;
}

export function validateTableAccess(sql: string, allowedTables: string[]): void {
  const referenced = extractTableNames(sql);
  const allowed = new Set(allowedTables.map((t) => t.toLowerCase()));

  for (const ref of referenced) {
    // Block system schema access (e.g. "mysql.user", "pg_catalog.pg_authid")
    const schema = ref.includes(".") ? ref.split(".")[0] : null;
    if (schema && SYSTEM_SCHEMAS.includes(schema)) {
      throw new Error(`禁止查詢系統資料表: ${ref}`);
    }
    // Also block direct references to known system tables
    if (SYSTEM_SCHEMAS.includes(ref)) {
      throw new Error(`禁止查詢系統資料表: ${ref}`);
    }

    // Check the table name part (after schema prefix if any)
    const tableName = ref.includes(".") ? ref.split(".")[1] : ref;
    if (!allowed.has(tableName)) {
      throw new Error(`無權存取資料表: ${tableName}`);
    }
  }
}

export function ensurePagination(
  sql: string,
  limit?: number,
  offset?: number
): string {
  const trimmed = sql.trim().replace(/;+\s*$/, "");
  const effectiveLimit = Math.min(limit ?? MAX_ROWS, MAX_ROWS);

  // If SQL already has LIMIT, cap it at MAX_ROWS
  if (/\bLIMIT\s+\d+/i.test(trimmed)) {
    const capped = trimmed.replace(/\bLIMIT\s+(\d+)/i, (_match, num) => {
      return `LIMIT ${Math.min(parseInt(num), MAX_ROWS)}`;
    });
    // Add OFFSET if requested and not already present
    if (offset && !/\bOFFSET\s+\d+/i.test(capped)) {
      return `${capped} OFFSET ${offset}`;
    }
    return capped;
  }

  // No LIMIT — inject LIMIT and optional OFFSET
  const limitClause = `LIMIT ${effectiveLimit}`;
  const offsetClause = offset ? ` OFFSET ${offset}` : "";
  return `${trimmed} ${limitClause}${offsetClause}`;
}

function truncateCellValues(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((row) => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === "string" && value.length > MAX_CELL_LENGTH) {
        result[key] = value.slice(0, MAX_CELL_LENGTH) + "…";
      } else {
        result[key] = value;
      }
    }
    return result;
  });
}

export async function executeQuery(
  config: DbConnectionConfig,
  sql: string,
  options?: { limit?: number; offset?: number }
): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
  validateSelectOnly(sql);
  const safeSql = ensurePagination(sql, options?.limit, options?.offset);

  if (config.type === "POSTGRESQL") {
    return withPgClient(config, async (client) => {
      await client.query(`SET statement_timeout = ${QUERY_TIMEOUT_MS}`);
      const result = await client.query(safeSql);
      const rows = truncateCellValues(result.rows.slice(0, MAX_ROWS));
      return { rows, rowCount: rows.length };
    });
  }

  return withMysqlConnection(config, async (conn) => {
    await conn.query(`SET SESSION MAX_EXECUTION_TIME = ${QUERY_TIMEOUT_MS}`);
    const [rawRows] = await conn.query<mysql.RowDataPacket[]>(safeSql);
    const rows = truncateCellValues(
      (rawRows as Record<string, unknown>[]).slice(0, MAX_ROWS)
    );
    return { rows, rowCount: rows.length };
  });
}

export async function testConnection(config: DbConnectionConfig): Promise<void> {
  if (config.type === "POSTGRESQL") {
    await withPgClient(config, async (client) => {
      await client.query("SELECT 1");
    });
  } else {
    await withMysqlConnection(config, async (conn) => {
      await conn.query("SELECT 1");
    });
  }
}

export async function introspectSchema(config: DbConnectionConfig): Promise<IntrospectedTable[]> {
  if (config.type === "POSTGRESQL") {
    return introspectPostgres(config);
  }
  return introspectMysql(config);
}

async function introspectPostgres(config: DbConnectionConfig): Promise<IntrospectedTable[]> {
  return withPgClient(config, async (client) => {
    const tablesResult = await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name`
    );

    const tableNames = tablesResult.rows.map((r) => r.table_name);
    if (tableNames.length === 0) return [];

    const columnsResult = await client.query<{
      table_name: string;
      column_name: string;
      data_type: string;
      character_maximum_length: number | null;
      is_nullable: string;
    }>(
      `SELECT table_name, column_name, data_type, character_maximum_length, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = ANY($1)
       ORDER BY table_name, ordinal_position`,
      [tableNames]
    );

    const pkResult = await client.query<{
      table_name: string;
      column_name: string;
    }>(
      `SELECT kcu.table_name, kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
       WHERE tc.constraint_type = 'PRIMARY KEY'
         AND tc.table_schema = 'public'
         AND tc.table_name = ANY($1)`,
      [tableNames]
    );

    const pkSet = new Set(pkResult.rows.map((r) => `${r.table_name}.${r.column_name}`));

    const tableMap = new Map<string, IntrospectedColumn[]>();
    for (const name of tableNames) {
      tableMap.set(name, []);
    }

    for (const col of columnsResult.rows) {
      const dataType = col.character_maximum_length
        ? `${col.data_type}(${col.character_maximum_length})`
        : col.data_type;

      tableMap.get(col.table_name)!.push({
        columnName: col.column_name,
        dataType,
        isNullable: col.is_nullable === "YES",
        isPrimaryKey: pkSet.has(`${col.table_name}.${col.column_name}`),
      });
    }

    return tableNames.map((name) => ({
      tableName: name,
      columns: tableMap.get(name)!,
    }));
  });
}

async function introspectMysql(config: DbConnectionConfig): Promise<IntrospectedTable[]> {
  return withMysqlConnection(config, async (conn) => {
    const [tableRows] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT TABLE_NAME as table_name FROM information_schema.tables
       WHERE table_schema = ? AND table_type = 'BASE TABLE'
       ORDER BY table_name`,
      [config.database]
    );

    const tableNames = tableRows.map((r) => r.table_name as string);
    if (tableNames.length === 0) return [];

    const [columnRows] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT TABLE_NAME as table_name, COLUMN_NAME as column_name,
              COLUMN_TYPE as column_type, IS_NULLABLE as is_nullable,
              COLUMN_KEY as column_key
       FROM information_schema.columns
       WHERE table_schema = ? AND TABLE_NAME IN (?)
       ORDER BY table_name, ordinal_position`,
      [config.database, tableNames]
    );

    const tableMap = new Map<string, IntrospectedColumn[]>();
    for (const name of tableNames) {
      tableMap.set(name, []);
    }

    for (const col of columnRows) {
      tableMap.get(col.table_name as string)!.push({
        columnName: col.column_name as string,
        dataType: col.column_type as string,
        isNullable: col.is_nullable === "YES",
        isPrimaryKey: col.column_key === "PRI",
      });
    }

    return tableNames.map((name) => ({
      tableName: name,
      columns: tableMap.get(name)!,
    }));
  });
}
