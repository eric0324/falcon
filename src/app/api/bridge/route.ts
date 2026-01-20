import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  resolvePermission,
  checkToolAuthorization,
  getAccessibleDataSources,
} from "@/lib/permissions";
import { executePostgresQuery } from "@/lib/connectors/postgres";
import { executeMySQLQuery } from "@/lib/connectors/mysql";
import { executeRestApiCall } from "@/lib/connectors/rest-api";
import type { DatabaseConfig, RestApiConfig } from "@/lib/connectors/base";

interface BridgeRequest {
  toolId: string;
  operation: "query" | "call" | "getSources";
  source?: string;
  sql?: string;
  params?: unknown[];
  endpoint?: string;
  data?: unknown;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const department = session.user.department;

    const body: BridgeRequest = await request.json();
    const { toolId, operation, source, sql, params, endpoint, data } = body;

    // Validate tool exists and user has access
    const tool = await prisma.tool.findUnique({
      where: { id: toolId },
      select: {
        id: true,
        allowedSources: true,
        authorId: true,
        visibility: true,
      },
    });

    if (!tool) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    // Handle getSources operation
    if (operation === "getSources") {
      const accessibleSources = await getAccessibleDataSources(department);

      // Filter by tool's allowed sources
      const filteredSources = accessibleSources.filter((s) =>
        tool.allowedSources.length === 0 ||
        tool.allowedSources.includes(s.dataSource.name)
      );

      const result = filteredSources.map((s) => ({
        name: s.dataSource.name,
        displayName: s.dataSource.displayName,
        type: s.dataSource.type,
        description: s.dataSource.description,
        allowedTables: s.allowedTables,
      }));

      return NextResponse.json({ data: result });
    }

    // For query and call operations, source is required
    if (!source) {
      return NextResponse.json(
        { error: "Data source is required" },
        { status: 400 }
      );
    }

    // Check tool authorization for data source
    if (
      tool.allowedSources.length > 0 &&
      !checkToolAuthorization(tool.allowedSources, source)
    ) {
      return NextResponse.json(
        { error: `Tool is not authorized to access data source: ${source}` },
        { status: 403 }
      );
    }

    // Resolve user permissions for data source
    const permission = await resolvePermission(source, department);
    if (!permission || !permission.canRead) {
      return NextResponse.json(
        { error: `Access denied to data source: ${source}` },
        { status: 403 }
      );
    }

    let result: unknown;
    let rowCount: number | undefined;

    if (operation === "query") {
      // Handle database query
      if (!sql) {
        return NextResponse.json(
          { error: "SQL query is required" },
          { status: 400 }
        );
      }

      const config = permission.dataSource.config as unknown as DatabaseConfig;
      const queryParams = (params || []) as unknown[];

      const queryOptions = {
        timeout: 5000,
        allowedTables: permission.allowedTables,
        blockedColumns: permission.blockedColumns,
      };

      if (permission.dataSource.type === "POSTGRES") {
        const queryResult = await executePostgresQuery(
          config,
          sql,
          queryParams,
          queryOptions
        );
        result = queryResult.rows;
        rowCount = queryResult.rowCount;
      } else if (permission.dataSource.type === "MYSQL") {
        const queryResult = await executeMySQLQuery(
          config,
          sql,
          queryParams,
          queryOptions
        );
        result = queryResult.rows;
        rowCount = queryResult.rowCount;
      } else {
        return NextResponse.json(
          { error: "Data source type does not support queries" },
          { status: 400 }
        );
      }

      // Log the API call
      await prisma.apiLog.create({
        data: {
          dataSourceId: permission.dataSource.id,
          toolId,
          userId,
          department: department || "*",
          operation: "query",
          query: sql,
          params: params ? JSON.parse(JSON.stringify(params)) : null,
          success: true,
          rowCount,
          duration: Date.now() - startTime,
        },
      });
    } else if (operation === "call") {
      // Handle REST API call
      if (!endpoint) {
        return NextResponse.json(
          { error: "API endpoint is required" },
          { status: 400 }
        );
      }

      if (permission.dataSource.type !== "REST_API") {
        return NextResponse.json(
          { error: "Data source type does not support API calls" },
          { status: 400 }
        );
      }

      const config = permission.dataSource.config as unknown as RestApiConfig;
      const allowedEndpoints = permission.dataSource.allowedEndpoints;

      result = await executeRestApiCall(config, endpoint, data, allowedEndpoints);

      // Log the API call
      await prisma.apiLog.create({
        data: {
          dataSourceId: permission.dataSource.id,
          toolId,
          userId,
          department: department || "*",
          operation: "call",
          method: data ? "POST" : "GET",
          query: endpoint,
          params: data ? JSON.parse(JSON.stringify(data)) : null,
          success: true,
          duration: Date.now() - startTime,
        },
      });
    } else {
      return NextResponse.json(
        { error: `Unknown operation: ${operation}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Try to log the error
    try {
      const session = await getServerSession(authOptions);
      const body: BridgeRequest = await request.clone().json();

      if (session?.user?.id && body.source) {
        const dataSource = await prisma.dataSource.findUnique({
          where: { name: body.source },
        });

        if (dataSource) {
          await prisma.apiLog.create({
            data: {
              dataSourceId: dataSource.id,
              toolId: body.toolId,
              userId: session.user.id,
              department: session.user.department || "*",
              operation: body.operation,
              method: body.operation === "call" ? (body.data ? "POST" : "GET") : undefined,
              query: body.sql || body.endpoint,
              params: body.params || body.data
                ? JSON.parse(JSON.stringify(body.params || body.data))
                : null,
              success: false,
              errorMessage,
              duration: Date.now() - startTime,
            },
          });
        }
      }
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
