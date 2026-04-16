import { NextResponse } from "next/server";
import { parse as parseCsv } from "csv-parse/sync";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getKnowledgeBaseRole, hasMinRole } from "@/lib/knowledge/permissions";
import { hasValidToken } from "@/lib/google/token-manager";
import { GoogleDriveConnector } from "@/lib/connectors/google/drive";
import { chunkSegments } from "@/lib/knowledge/chunker";
import type { ParsedSegment } from "@/lib/knowledge/parsers";

const DOC_MIME = "application/vnd.google-apps.document";
const SHEET_MIME = "application/vnd.google-apps.spreadsheet";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function buildAuthUrl(req: Request, knowledgeBaseId: string): string {
  const url = new URL(req.url);
  const returnUrl = `/knowledge/${knowledgeBaseId}`;
  return `${url.origin}/api/google/authorize?service=drive&returnUrl=${encodeURIComponent(returnUrl)}`;
}

// GET /api/knowledge-bases/:id/import-drive?query=&cursor= — search Drive Docs/Sheets
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

  if (!(await hasValidToken(session.user.id, "DRIVE"))) {
    return NextResponse.json(
      { error: "needs_auth", authUrl: buildAuthUrl(req, id) },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const query = url.searchParams.get("query") || "";
  const cursor = url.searchParams.get("cursor") || undefined;

  const drive = new GoogleDriveConnector(session.user.id);
  await drive.connect();

  const result = await drive.searchImportableFiles({ query, cursor });

  return NextResponse.json({
    files: result.files,
    nextCursor: result.nextCursor,
    hasMore: result.hasMore,
  });
}

// POST /api/knowledge-bases/:id/import-drive — import a Drive Doc or Sheet
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

  if (!(await hasValidToken(session.user.id, "DRIVE"))) {
    return NextResponse.json(
      { error: "needs_auth", authUrl: buildAuthUrl(req, id) },
      { status: 401 }
    );
  }

  const body = await req.json();
  const { fileId, fileName, mimeType } = body as {
    fileId?: string;
    fileName?: string;
    mimeType?: string;
  };
  if (!fileId || !fileName || !mimeType) {
    return NextResponse.json(
      { error: "fileId, fileName, mimeType are required" },
      { status: 400 }
    );
  }

  const drive = new GoogleDriveConnector(session.user.id);
  await drive.connect();

  let segments: ParsedSegment[] = [];
  let fileType: string;
  let displayPrefix: string;

  if (mimeType === DOC_MIME) {
    fileType = "gdoc";
    displayPrefix = "Drive Doc";
    const text = (await drive.exportDocAsMarkdown(fileId)).trim();
    if (!text) {
      return NextResponse.json({ error: "此文件沒有可匯入的內容" }, { status: 400 });
    }
    segments = chunkSegments([
      { text, metadata: { source: `${displayPrefix}: ${fileName}` } },
    ]);
  } else if (mimeType === SHEET_MIME) {
    fileType = "gsheet";
    displayPrefix = "Drive Sheet";
    const csv = await drive.exportSheetAsCsv(fileId);
    const records = parseCsv(csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];

    segments = records
      .map((row, i) => {
        const parts = Object.entries(row)
          .filter(([, v]) => v && v.trim())
          .map(([k, v]) => `${k}: ${v}`);
        const text = parts.join(" | ");
        const rowNumber = i + 2; // row 1 is header in the visible spreadsheet
        return {
          text,
          metadata: {
            source: `${displayPrefix}: ${fileName} - 第 ${rowNumber} 列`,
            row: rowNumber,
          },
        };
      })
      .filter((s) => s.text.trim().length > 0);

    if (segments.length === 0) {
      return NextResponse.json(
        { error: "此試算表沒有可匯入的內容" },
        { status: 400 }
      );
    }
  } else {
    return NextResponse.json(
      { error: "Unsupported mimeType: only Google Docs and Sheets are supported" },
      { status: 400 }
    );
  }

  const totalSize = segments.reduce(
    (sum, s) => sum + Buffer.byteLength(s.text, "utf-8"),
    0
  );

  const upload = await prisma.knowledgeUpload.create({
    data: {
      knowledgeBaseId: id,
      uploadedBy: session.user.id,
      fileName: `${displayPrefix}: ${fileName}`,
      fileType,
      fileSize: totalSize,
      status: "PENDING_REVIEW",
    },
  });

  await prisma.knowledgePoint.createMany({
    data: segments.map((s) => ({
      knowledgeBaseId: id,
      uploadId: upload.id,
      content: s.text,
      metadata: s.metadata,
      status: "PENDING" as const,
    })),
  });

  await prisma.knowledgeUpload.update({
    where: { id: upload.id },
    data: { pointCount: segments.length },
  });

  return NextResponse.json(
    {
      success: true,
      pointCount: segments.length,
      uploadId: upload.id,
    },
    { status: 201 }
  );
}
