import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getKnowledgeBaseRole, hasMinRole } from "@/lib/knowledge/permissions";
import { parseUploadQueue } from "@/lib/queue/queues";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/knowledge-bases/:id/uploads — list uploads
export async function GET(_req: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const role = await getKnowledgeBaseRole(id, session.user.id);
  if (!role) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const uploads = await prisma.knowledgeUpload.findMany({
    where: { knowledgeBaseId: id },
    orderBy: { createdAt: "desc" },
    include: {
      uploader: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(uploads);
}

// POST /api/knowledge-bases/:id/uploads — upload file
export async function POST(req: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const role = await getKnowledgeBaseRole(id, session.user.id);
  if (!hasMinRole(role, "CONTRIBUTOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate file type
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !["pdf", "xlsx", "xls", "csv"].includes(ext)) {
    return NextResponse.json(
      { error: "Unsupported file type. Supported: PDF, Excel, CSV" },
      { status: 400 }
    );
  }

  // Max 10MB
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  // Create upload record
  const upload = await prisma.knowledgeUpload.create({
    data: {
      knowledgeBaseId: id,
      uploadedBy: session.user.id,
      fileName: file.name,
      fileType: ext,
      fileSize: file.size,
      status: "PROCESSING",
    },
  });

  // Convert file to base64 and enqueue job
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileBase64 = buffer.toString("base64");

  await parseUploadQueue.add("parse", {
    uploadId: upload.id,
    knowledgeBaseId: id,
    fileBase64,
    fileName: file.name,
    fileType: ext,
  });

  return NextResponse.json(upload, { status: 201 });
}
