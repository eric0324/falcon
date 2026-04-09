import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { dispatchBridge } from "@/lib/bridge/handlers";
import { logDataSourceCall, sanitizeBridgeParams, sanitizeResponse } from "@/lib/data-source-log";

async function getUser(session: { user?: { email?: string | null } } | null) {
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
}

export async function POST(req: Request) {
  // 1. Session auth
  const session = await getSession();
  const user = await getUser(session);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { toolId, dataSources: previewDataSources, dataSourceId, action, params } = body;

    if (!dataSourceId || !action) {
      return NextResponse.json(
        { error: "dataSourceId and action are required" },
        { status: 400 }
      );
    }

    // 2. Platform capabilities (always allowed, skip permission check)
    const isPlatformCapability = dataSourceId === "llm" || dataSourceId === "tooldb" || dataSourceId === "scrape";

    // 3. For non-platform calls, check data source permissions
    let toolName: string | undefined;

    if (!isPlatformCapability) {
      let allowedSources: string[];

      if (previewDataSources && Array.isArray(previewDataSources)) {
        // Preview mode (or preview with toolId): use the provided list
        allowedSources = previewDataSources;
        if (toolId) {
          const tool = await prisma.tool.findUnique({
            where: { id: toolId },
            select: { name: true },
          });
          toolName = tool?.name;
        }
      } else if (toolId) {
        // Published mode: look up from Tool.dataSources
        const tool = await prisma.tool.findUnique({
          where: { id: toolId },
          select: { dataSources: true, name: true },
        });
        if (!tool) {
          return NextResponse.json({ error: "Tool not found" }, { status: 404 });
        }
        allowedSources = (tool.dataSources as string[]) || [];
        toolName = tool.name;
      } else {
        return NextResponse.json(
          { error: "Either toolId or dataSources is required" },
          { status: 400 }
        );
      }

      const isAllowed = allowedSources.some((src) => {
        if (dataSourceId.startsWith("extdb_") && src.startsWith("extdb_")) {
          return src === dataSourceId;
        }
        return src === dataSourceId;
      });

      if (!isAllowed) {
        return NextResponse.json(
          { error: `Data source "${dataSourceId}" is not authorized for this tool` },
          { status: 403 }
        );
      }
    }

    // 4. Dispatch to handler with logging
    const start = Date.now();
    try {
      const data = await dispatchBridge(user.id, dataSourceId, action, params || {}, { toolId });
      logDataSourceCall({
        userId: user.id,
        toolId: toolId ?? undefined,
        source: "bridge",
        dataSourceId,
        action,
        toolName,
        params: sanitizeBridgeParams(action, params),
        response: sanitizeResponse(data as Record<string, unknown>),
        success: true,
        durationMs: Date.now() - start,
        rowCount: (data as Record<string, unknown>)?.rowCount as number | undefined,
      });
      return NextResponse.json({ data });
    } catch (error) {
      logDataSourceCall({
        userId: user.id,
        toolId: toolId ?? undefined,
        source: "bridge",
        dataSourceId,
        action,
        toolName,
        params: sanitizeBridgeParams(action, params),
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - start,
      });
      console.error("POST /api/bridge error:", error);
      const message = error instanceof Error ? error.message : "Bridge request failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (error) {
    console.error("POST /api/bridge error:", error);
    const message = error instanceof Error ? error.message : "Bridge request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
