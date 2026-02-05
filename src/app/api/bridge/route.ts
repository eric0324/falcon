import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getConnectorManager } from "@/lib/connectors/manager";
import { ExecuteParams } from "@/lib/connectors/types";
import { initializeBuiltinConnectors } from "@/lib/connectors/registry";

// Initialize built-in connectors
initializeBuiltinConnectors();

export async function POST(req: Request) {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body = await req.json();
    const {
      toolId,
      dataSourceId,
      operation,
      sql,
      params,
      resource,
      data,
      where,
      filters,
      limit,
      offset,
      timeout,
    } = body;

    // 3. Validate required fields
    if (!dataSourceId) {
      return NextResponse.json(
        { error: "Missing required field: dataSourceId" },
        { status: 400 }
      );
    }

    if (!operation) {
      return NextResponse.json(
        { error: "Missing required field: operation" },
        { status: 400 }
      );
    }

    const validOperations = ["query", "list", "create", "update", "delete"];
    if (!validOperations.includes(operation)) {
      return NextResponse.json(
        { error: `Invalid operation: ${operation}. Must be one of: ${validOperations.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate operation-specific fields
    if (operation === "query" && !sql) {
      return NextResponse.json(
        { error: "Missing required field for query operation: sql" },
        { status: 400 }
      );
    }

    if (["create", "update", "delete"].includes(operation) && !resource) {
      return NextResponse.json(
        { error: `Missing required field for ${operation} operation: resource` },
        { status: 400 }
      );
    }

    if (["create", "update"].includes(operation) && !data) {
      return NextResponse.json(
        { error: `Missing required field for ${operation} operation: data` },
        { status: 400 }
      );
    }

    // 4. Build execute params
    const executeParams: ExecuteParams = {
      dataSourceId,
      operation,
      userId: session.user.id,
      department: session.user.department || "default",
      toolId,
      sql,
      params,
      resource,
      data,
      where,
      filters,
      limit,
      offset,
      timeout,
    };

    // 5. Execute operation
    const manager = getConnectorManager();
    const result = await manager.execute(executeParams);

    // 6. Return result
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
        rowCount: result.rowCount,
        duration: result.duration,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          duration: result.duration,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Bridge API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
