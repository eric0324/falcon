#!/usr/bin/env npx tsx

import { Command } from "commander";
import { PrismaClient, DataSourceType, Prisma } from "@prisma/client";
import { Client as PgClient } from "pg";
import mysql from "mysql2/promise";

const prisma = new PrismaClient();
const program = new Command();

program
  .name("datasource")
  .description("Manage data sources and permissions for API Bridge")
  .version("1.0.0");

// ===== Data Source Commands =====

program
  .command("list")
  .description("List all data sources")
  .action(async () => {
    const sources = await prisma.dataSource.findMany({
      include: {
        permissions: true,
        _count: { select: { apiLogs: true } },
      },
    });

    if (sources.length === 0) {
      console.log("No data sources found.");
      return;
    }

    console.log("\nData Sources:\n");
    for (const source of sources) {
      const status = source.isActive ? "✓ Active" : "✗ Inactive";
      console.log(`  ${source.name} (${source.type})`);
      console.log(`    Display: ${source.displayName}`);
      console.log(`    Status: ${status}`);
      console.log(`    Permissions: ${source.permissions.length} department(s)`);
      console.log(`    API Logs: ${source._count.apiLogs}`);
      console.log("");
    }
  });

program
  .command("add")
  .description("Add a new data source")
  .requiredOption("--name <name>", "Unique identifier (e.g., db_main)")
  .requiredOption("--display-name <displayName>", "Display name (e.g., 主資料庫)")
  .requiredOption("--type <type>", "Type: postgres, mysql, or rest_api")
  .option("--description <description>", "Description")
  .option("--host <host>", "Database host")
  .option("--port <port>", "Database port")
  .option("--database <database>", "Database name")
  .option("--user <user>", "Database user")
  .option("--password <password>", "Database password")
  .option("--base-url <baseUrl>", "REST API base URL")
  .option("--header <header...>", "REST API headers (key:value)")
  .option("--endpoints <endpoints>", "Allowed endpoints (comma-separated)")
  .option("--global-blocked-columns <columns>", "Globally blocked columns (comma-separated)")
  .action(async (options) => {
    const type = options.type.toUpperCase().replace("-", "_") as DataSourceType;

    if (!["POSTGRES", "MYSQL", "REST_API"].includes(type)) {
      console.error("Error: Invalid type. Must be postgres, mysql, or rest_api");
      process.exit(1);
    }

    let config: Record<string, unknown> = {};

    if (type === "REST_API") {
      if (!options.baseUrl) {
        console.error("Error: --base-url is required for REST API");
        process.exit(1);
      }
      const headers: Record<string, string> = {};
      if (options.header) {
        for (const h of options.header) {
          const [key, ...valueParts] = h.split(":");
          headers[key.trim()] = valueParts.join(":").trim();
        }
      }
      config = { baseUrl: options.baseUrl, headers };
    } else {
      if (!options.host || !options.database || !options.user) {
        console.error("Error: --host, --database, and --user are required for database");
        process.exit(1);
      }
      config = {
        host: options.host,
        port: parseInt(options.port || (type === "POSTGRES" ? "5432" : "3306")),
        database: options.database,
        user: options.user,
        password: options.password || "",
      };
    }

    const globalBlockedColumns = options.globalBlockedColumns
      ? options.globalBlockedColumns.split(",").map((c: string) => c.trim())
      : [];

    const allowedEndpoints = options.endpoints
      ? options.endpoints.split(",").map((e: string) => e.trim())
      : [];

    try {
      const source = await prisma.dataSource.create({
        data: {
          name: options.name,
          displayName: options.displayName,
          description: options.description,
          type,
          config: config as Prisma.InputJsonValue,
          globalBlockedColumns,
          allowedEndpoints,
        },
      });

      console.log(`✓ Data source "${source.name}" created successfully`);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes("Unique constraint")) {
        console.error(`Error: Data source "${options.name}" already exists`);
      } else {
        console.error("Error:", error);
      }
      process.exit(1);
    }
  });

program
  .command("update <name>")
  .description("Update a data source")
  .option("--display-name <displayName>", "Display name")
  .option("--description <description>", "Description")
  .option("--global-blocked-columns <columns>", "Globally blocked columns (comma-separated)")
  .option("--endpoints <endpoints>", "Allowed endpoints (comma-separated)")
  .action(async (name, options) => {
    const data: Record<string, unknown> = {};

    if (options.displayName) data.displayName = options.displayName;
    if (options.description) data.description = options.description;
    if (options.globalBlockedColumns) {
      data.globalBlockedColumns = options.globalBlockedColumns.split(",").map((c: string) => c.trim());
    }
    if (options.endpoints) {
      data.allowedEndpoints = options.endpoints.split(",").map((e: string) => e.trim());
    }

    if (Object.keys(data).length === 0) {
      console.error("Error: No update options provided");
      process.exit(1);
    }

    try {
      await prisma.dataSource.update({
        where: { name },
        data,
      });
      console.log(`✓ Data source "${name}" updated`);
    } catch {
      console.error(`Error: Data source "${name}" not found`);
      process.exit(1);
    }
  });

program
  .command("remove <name>")
  .description("Remove a data source")
  .option("--force", "Skip confirmation")
  .action(async (name, options) => {
    const source = await prisma.dataSource.findUnique({ where: { name } });
    if (!source) {
      console.error(`Error: Data source "${name}" not found`);
      process.exit(1);
    }

    if (!options.force) {
      console.log(`Warning: This will delete data source "${name}" and all its permissions.`);
      console.log("Use --force to confirm.");
      process.exit(1);
    }

    await prisma.dataSource.delete({ where: { name } });
    console.log(`✓ Data source "${name}" removed`);
  });

program
  .command("disable <name>")
  .description("Disable a data source")
  .action(async (name) => {
    try {
      await prisma.dataSource.update({
        where: { name },
        data: { isActive: false },
      });
      console.log(`✓ Data source "${name}" disabled`);
    } catch {
      console.error(`Error: Data source "${name}" not found`);
      process.exit(1);
    }
  });

program
  .command("enable <name>")
  .description("Enable a data source")
  .action(async (name) => {
    try {
      await prisma.dataSource.update({
        where: { name },
        data: { isActive: true },
      });
      console.log(`✓ Data source "${name}" enabled`);
    } catch {
      console.error(`Error: Data source "${name}" not found`);
      process.exit(1);
    }
  });

program
  .command("sync-schema <name>")
  .description("Sync database schema (introspect tables and columns)")
  .action(async (name) => {
    const source = await prisma.dataSource.findUnique({ where: { name } });
    if (!source) {
      console.error(`Error: Data source "${name}" not found`);
      process.exit(1);
    }

    if (source.type === "REST_API") {
      console.error("Error: sync-schema is only for database sources");
      process.exit(1);
    }

    const config = source.config as { host: string; port: number; database: string; user: string; password: string };

    if (source.type === "POSTGRES") {
      const client = new PgClient({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
      });

      try {
        await client.connect();

        const tablesResult = await client.query(`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          ORDER BY table_name
        `);

        const schema: Record<string, string[]> = {};

        for (const row of tablesResult.rows) {
          const tableName = row.table_name;
          const columnsResult = await client.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = $1
            ORDER BY ordinal_position
          `, [tableName]);

          schema[tableName] = columnsResult.rows.map((r) => r.column_name);
        }

        await client.end();

        await prisma.dataSource.update({
          where: { name },
          data: { schema: schema as Prisma.InputJsonValue },
        });

        console.log(`✓ Schema synced for "${name}"`);
        console.log(`  Tables found: ${Object.keys(schema).length}`);
        for (const [table, columns] of Object.entries(schema)) {
          console.log(`    - ${table}: ${columns.length} columns`);
        }
      } catch (error) {
        console.error("Error connecting to database:", error);
        process.exit(1);
      }
    } else if (source.type === "MYSQL") {
      const dbName = config.database;
      if (!dbName) {
        console.error("Error: Database name not found in config");
        process.exit(1);
      }

      const connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        database: dbName,
        user: config.user,
        password: config.password,
      });

      try {
        // Get all tables (MySQL 8 returns uppercase column names)
        const [tables] = await connection.query(`
          SELECT TABLE_NAME as tableName
          FROM information_schema.tables
          WHERE table_schema = '${dbName}'
          AND table_type = 'BASE TABLE'
          ORDER BY TABLE_NAME
        `);

        const schema: Record<string, string[]> = {};

        for (const row of tables as Array<{ tableName: string }>) {
          const tableName = row.tableName;
          const [columns] = await connection.query(`
            SELECT COLUMN_NAME as columnName
            FROM information_schema.columns
            WHERE table_schema = '${dbName}'
            AND table_name = '${tableName}'
            ORDER BY ordinal_position
          `);

          schema[tableName] = (columns as Array<{ columnName: string }>).map((c) => c.columnName);
        }

        await connection.end();

        await prisma.dataSource.update({
          where: { name },
          data: { schema: schema as Prisma.InputJsonValue },
        });

        console.log(`✓ Schema synced for "${name}"`);
        console.log(`  Tables found: ${Object.keys(schema).length}`);
        for (const [table, columns] of Object.entries(schema)) {
          console.log(`    - ${table}: ${(columns as string[]).length} columns`);
        }
      } catch (error) {
        console.error("Error connecting to MySQL:", error);
        process.exit(1);
      }
    }
  });

// ===== Permission Commands =====

program
  .command("add-permission")
  .description("Add department permission for a data source")
  .requiredOption("--source <source>", "Data source name")
  .requiredOption("--department <department>", "Department name (or * for default)")
  .option("--read-tables <tables>", "Tables allowed for reading (comma-separated)")
  .option("--read-blocked-columns <columns>", "Columns blocked for reading (comma-separated)")
  .option("--write-tables <tables>", "Tables allowed for writing (comma-separated)")
  .option("--delete-tables <tables>", "Tables allowed for deleting (comma-separated)")
  .action(async (options) => {
    const source = await prisma.dataSource.findUnique({ where: { name: options.source } });
    if (!source) {
      console.error(`Error: Data source "${options.source}" not found`);
      process.exit(1);
    }

    const readTables = options.readTables
      ? options.readTables.split(",").map((t: string) => t.trim())
      : [];
    const readBlockedColumns = options.readBlockedColumns
      ? options.readBlockedColumns.split(",").map((c: string) => c.trim())
      : [];
    const writeTables = options.writeTables
      ? options.writeTables.split(",").map((t: string) => t.trim())
      : [];
    const deleteTables = options.deleteTables
      ? options.deleteTables.split(",").map((t: string) => t.trim())
      : [];

    try {
      await prisma.dataSourcePermission.create({
        data: {
          dataSourceId: source.id,
          department: options.department,
          readTables,
          readBlockedColumns,
          writeTables,
          deleteTables,
        },
      });
      console.log(`✓ Permission added for department "${options.department}" on "${options.source}"`);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes("Unique constraint")) {
        console.error(`Error: Permission for "${options.department}" on "${options.source}" already exists`);
        console.log("Use update-permission to modify existing permissions");
      } else {
        console.error("Error:", error);
      }
      process.exit(1);
    }
  });

program
  .command("update-permission")
  .description("Update department permission")
  .requiredOption("--source <source>", "Data source name")
  .requiredOption("--department <department>", "Department name")
  .option("--add-read-tables <tables>", "Add tables to read permission")
  .option("--remove-read-tables <tables>", "Remove tables from read permission")
  .option("--read-blocked-columns <columns>", "Set blocked columns (replaces existing)")
  .option("--add-write-tables <tables>", "Add tables to write permission")
  .option("--remove-write-tables <tables>", "Remove tables from write permission")
  .action(async (options) => {
    const source = await prisma.dataSource.findUnique({ where: { name: options.source } });
    if (!source) {
      console.error(`Error: Data source "${options.source}" not found`);
      process.exit(1);
    }

    const permission = await prisma.dataSourcePermission.findUnique({
      where: {
        dataSourceId_department: {
          dataSourceId: source.id,
          department: options.department,
        },
      },
    });

    if (!permission) {
      console.error(`Error: Permission for "${options.department}" on "${options.source}" not found`);
      process.exit(1);
    }

    let readTables = [...permission.readTables];
    let writeTables = [...permission.writeTables];
    let readBlockedColumns = [...permission.readBlockedColumns];

    if (options.addReadTables) {
      const toAdd = options.addReadTables.split(",").map((t: string) => t.trim());
      readTables = Array.from(new Set([...readTables, ...toAdd]));
    }
    if (options.removeReadTables) {
      const toRemove = options.removeReadTables.split(",").map((t: string) => t.trim());
      readTables = readTables.filter((t) => !toRemove.includes(t));
    }
    if (options.readBlockedColumns) {
      readBlockedColumns = options.readBlockedColumns.split(",").map((c: string) => c.trim());
    }
    if (options.addWriteTables) {
      const toAdd = options.addWriteTables.split(",").map((t: string) => t.trim());
      writeTables = Array.from(new Set([...writeTables, ...toAdd]));
    }
    if (options.removeWriteTables) {
      const toRemove = options.removeWriteTables.split(",").map((t: string) => t.trim());
      writeTables = writeTables.filter((t) => !toRemove.includes(t));
    }

    await prisma.dataSourcePermission.update({
      where: { id: permission.id },
      data: { readTables, writeTables, readBlockedColumns },
    });

    console.log(`✓ Permission updated for "${options.department}" on "${options.source}"`);
  });

program
  .command("list-permissions <source>")
  .description("List all permissions for a data source")
  .action(async (source) => {
    const dataSource = await prisma.dataSource.findUnique({
      where: { name: source },
      include: { permissions: true },
    });

    if (!dataSource) {
      console.error(`Error: Data source "${source}" not found`);
      process.exit(1);
    }

    console.log(`\nPermissions for "${source}":\n`);
    console.log(`Global blocked columns: ${dataSource.globalBlockedColumns.join(", ") || "(none)"}\n`);

    if (dataSource.permissions.length === 0) {
      console.log("No department permissions configured.");
      return;
    }

    for (const perm of dataSource.permissions) {
      console.log(`  ${perm.department === "*" ? "* (Default)" : perm.department}:`);
      console.log(`    Read tables: ${perm.readTables.join(", ") || "(none)"}`);
      console.log(`    Read blocked: ${perm.readBlockedColumns.join(", ") || "(none)"}`);
      if (perm.writeTables.length > 0) {
        console.log(`    Write tables: ${perm.writeTables.join(", ")}`);
      }
      if (perm.deleteTables.length > 0) {
        console.log(`    Delete tables: ${perm.deleteTables.join(", ")}`);
      }
      console.log("");
    }
  });

program
  .command("remove-permission")
  .description("Remove department permission")
  .requiredOption("--source <source>", "Data source name")
  .requiredOption("--department <department>", "Department name")
  .action(async (options) => {
    const source = await prisma.dataSource.findUnique({ where: { name: options.source } });
    if (!source) {
      console.error(`Error: Data source "${options.source}" not found`);
      process.exit(1);
    }

    try {
      await prisma.dataSourcePermission.delete({
        where: {
          dataSourceId_department: {
            dataSourceId: source.id,
            department: options.department,
          },
        },
      });
      console.log(`✓ Permission removed for "${options.department}" on "${options.source}"`);
    } catch {
      console.error(`Error: Permission for "${options.department}" on "${options.source}" not found`);
      process.exit(1);
    }
  });

// ===== Show Command =====

program
  .command("show <name>")
  .description("Show detailed info about a data source")
  .action(async (name) => {
    const source = await prisma.dataSource.findUnique({
      where: { name },
      include: {
        permissions: true,
        _count: { select: { apiLogs: true } },
      },
    });

    if (!source) {
      console.error(`Error: Data source "${name}" not found`);
      process.exit(1);
    }

    console.log(`\n${source.displayName} (${source.name})\n`);
    console.log(`Type: ${source.type}`);
    console.log(`Status: ${source.isActive ? "Active" : "Inactive"}`);
    console.log(`Description: ${source.description || "(none)"}`);
    console.log(`Global blocked columns: ${source.globalBlockedColumns.join(", ") || "(none)"}`);

    if (source.type === "REST_API") {
      const config = source.config as { baseUrl: string; headers: Record<string, string> };
      console.log(`Base URL: ${config.baseUrl}`);
      console.log(`Allowed endpoints: ${source.allowedEndpoints.join(", ") || "(none)"}`);
    } else {
      const config = source.config as { host: string; port: number; database: string };
      console.log(`Host: ${config.host}:${config.port}`);
      console.log(`Database: ${config.database}`);
    }

    if (source.schema) {
      const schema = source.schema as Record<string, string[]>;
      console.log(`\nSchema (${Object.keys(schema).length} tables):`);
      for (const [table, columns] of Object.entries(schema)) {
        console.log(`  - ${table}: ${columns.slice(0, 5).join(", ")}${columns.length > 5 ? `, ... (${columns.length} total)` : ""}`);
      }
    }

    console.log(`\nPermissions (${source.permissions.length}):`);
    for (const perm of source.permissions) {
      console.log(`  - ${perm.department}: read ${perm.readTables.length} tables`);
    }

    console.log(`\nAPI Logs: ${source._count.apiLogs} total`);
  });

program.parse();
