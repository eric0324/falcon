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
