import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dispatchBridge } from "@/lib/bridge/handlers";

async function getUser(session: { user?: { email?: string | null } } | null) {
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
}

export async function POST(req: Request) {
  // 1. Session auth
  const session = await getServerSession(authOptions);
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

    // 2. Determine allowed data sources
    let allowedSources: string[];

    if (toolId) {
      // Published mode: look up from Tool.dataSources
      const tool = await prisma.tool.findUnique({
        where: { id: toolId },
        select: { dataSources: true },
      });
      if (!tool) {
        return NextResponse.json({ error: "Tool not found" }, { status: 404 });
      }
      allowedSources = (tool.dataSources as string[]) || [];
    } else if (previewDataSources && Array.isArray(previewDataSources)) {
      // Preview mode: use the provided list
      allowedSources = previewDataSources;
    } else {
      return NextResponse.json(
        { error: "Either toolId or dataSources is required" },
        { status: 400 }
      );
    }

    // 3. Check dataSourceId is allowed
    // For extdb_*, check if any extdb_ source is in the allowed list
    // For google_*, check exact match
    const isAllowed = allowedSources.some((src) => {
      if (dataSourceId.startsWith("extdb_") && src.startsWith("extdb_")) {
        // extdb sources: exact match on the database ID
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

    // 4. Dispatch to handler
    const data = await dispatchBridge(user.id, dataSourceId, action, params || {});

    return NextResponse.json({ data });
  } catch (error) {
    console.error("POST /api/bridge error:", error);
    const message = error instanceof Error ? error.message : "Bridge request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
