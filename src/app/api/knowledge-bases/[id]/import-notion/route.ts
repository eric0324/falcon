import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getKnowledgeBaseRole, hasMinRole } from "@/lib/knowledge/permissions";
import {
  isNotionConfigured,
  notionSearch,
  getPage,
  getBlockChildrenDeep,
  blocksToText,
  resolveParentLabel,
  createParentCache,
} from "@/lib/integrations/notion";
import type { NotionPage } from "@/lib/integrations/notion";
import { chunkSegments } from "@/lib/knowledge/chunker";
import type { ParsedSegment } from "@/lib/knowledge/parsers";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/knowledge-bases/:id/import-notion?query=xxx — search Notion pages
export async function GET(req: Request, context: RouteContext) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const role = await getKnowledgeBaseRole(id, session.user.id);
  if (!hasMinRole(role, "CONTRIBUTOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isNotionConfigured()) {
    return NextResponse.json({ error: "Notion is not configured" }, { status: 400 });
  }

  const url = new URL(req.url);
  const query = url.searchParams.get("query") || "";
  const cursor = url.searchParams.get("cursor") || undefined;

  const result = await notionSearch({
    query,
    filter: { property: "object", value: "page" },
    sort: { direction: "descending", timestamp: "last_edited_time" },
    page_size: 25,
    start_cursor: cursor,
  });

  const parentCache = createParentCache();

  const pages = await Promise.all(
    result.results
      .filter((r): r is NotionPage => (r as { object?: string }).object !== "database")
      .map(async (page) => {
        const titleProp = Object.values(page.properties || {}).find(
          (p: unknown) => (p as Record<string, unknown>).type === "title"
        ) as { title: Array<{ plain_text: string }> } | undefined;
        const title =
          titleProp?.title?.map((t) => t.plain_text).join("") || "Untitled";

        const parent = await resolveParentLabel(page, parentCache);

        return {
          id: page.id,
          title,
          url: page.url,
          lastEditedTime: (page as unknown as { last_edited_time: string })
            .last_edited_time,
          icon: page.icon ?? null,
          parentLabel: parent.label,
          parentType: parent.type,
        };
      })
  );

  return NextResponse.json({
    pages,
    nextCursor: result.next_cursor,
    hasMore: result.has_more,
  });
}

// POST /api/knowledge-bases/:id/import-notion — import a Notion page
export async function POST(req: Request, context: RouteContext) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const role = await getKnowledgeBaseRole(id, session.user.id);
  if (!hasMinRole(role, "CONTRIBUTOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isNotionConfigured()) {
    return NextResponse.json({ error: "Notion is not configured" }, { status: 400 });
  }

  const body = await req.json();
  const { pageId, pageTitle } = body;

  if (!pageId) {
    return NextResponse.json({ error: "pageId is required" }, { status: 400 });
  }

  // Fetch page content from blocks
  const blocks = await getBlockChildrenDeep(pageId, 3);
  let text = blocksToText(blocks).trim();

  // If blocks are empty, try extracting from page properties
  if (!text) {
    const page = await getPage(pageId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const props = (page as any).properties as Record<string, unknown> | undefined;
    if (props) {
      const lines: string[] = [];
      for (const [key, val] of Object.entries(props)) {
        const prop = val as Record<string, unknown>;
        if (prop.type === "title") {
          const titleTexts = (prop.title as Array<{ plain_text: string }>) || [];
          lines.push(`${key}: ${titleTexts.map((t) => t.plain_text).join("")}`);
        } else if (prop.type === "rich_text") {
          const richTexts = (prop.rich_text as Array<{ plain_text: string }>) || [];
          const v = richTexts.map((t) => t.plain_text).join("");
          if (v) lines.push(`${key}: ${v}`);
        } else if (prop.type === "number" && prop.number != null) {
          lines.push(`${key}: ${prop.number}`);
        } else if (prop.type === "select" && prop.select) {
          lines.push(`${key}: ${(prop.select as { name: string }).name}`);
        } else if (prop.type === "multi_select") {
          const opts = (prop.multi_select as Array<{ name: string }>) || [];
          if (opts.length) lines.push(`${key}: ${opts.map((o) => o.name).join(", ")}`);
        } else if (prop.type === "date" && prop.date) {
          const d = prop.date as { start: string; end?: string };
          lines.push(`${key}: ${d.start}${d.end ? ` ~ ${d.end}` : ""}`);
        } else if (prop.type === "url" && prop.url) {
          lines.push(`${key}: ${prop.url}`);
        } else if (prop.type === "email" && prop.email) {
          lines.push(`${key}: ${prop.email}`);
        } else if (prop.type === "checkbox") {
          lines.push(`${key}: ${prop.checkbox ? "Yes" : "No"}`);
        }
      }
      text = lines.join("\n");
    }
  }

  if (!text) {
    return NextResponse.json({ error: "此頁面沒有可匯入的內容" }, { status: 400 });
  }

  // Create upload record
  const upload = await prisma.knowledgeUpload.create({
    data: {
      knowledgeBaseId: id,
      uploadedBy: session.user.id,
      fileName: `Notion: ${pageTitle || pageId}`,
      fileType: "notion",
      fileSize: Buffer.byteLength(text, "utf-8"),
      status: "PENDING_REVIEW",
    },
  });

  // Chunk the content
  const segments: ParsedSegment[] = [{
    text,
    metadata: { source: `Notion: ${pageTitle || pageId}` },
  }];
  const chunks = chunkSegments(segments);

  // Create knowledge points
  await prisma.knowledgePoint.createMany({
    data: chunks.map((chunk) => ({
      knowledgeBaseId: id,
      uploadId: upload.id,
      content: chunk.text,
      metadata: chunk.metadata,
      status: "PENDING" as const,
    })),
  });

  // Update upload record
  await prisma.knowledgeUpload.update({
    where: { id: upload.id },
    data: { pointCount: chunks.length },
  });

  return NextResponse.json({
    success: true,
    pointCount: chunks.length,
    uploadId: upload.id,
  }, { status: 201 });
}
