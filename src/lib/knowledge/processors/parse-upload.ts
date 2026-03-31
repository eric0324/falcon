import type { Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import { getParser } from "@/lib/knowledge/parsers";
import { chunkSegments } from "@/lib/knowledge/chunker";

interface ParseUploadData {
  uploadId: string;
  knowledgeBaseId: string;
  fileBase64: string;
  fileName: string;
  fileType: string;
}

export async function parseUploadProcessor(job: Job<ParseUploadData>) {
  const { uploadId, knowledgeBaseId, fileBase64, fileName, fileType } = job.data;

  try {
    // 1. Get parser
    const parser = getParser(fileType);
    if (!parser) {
      throw new Error(`No parser for file type: ${fileType}`);
    }

    // 2. Parse file
    const buffer = Buffer.from(fileBase64, "base64");
    const segments = await parser.parse(buffer, fileName);

    // 3. Chunk segments
    const chunks = chunkSegments(segments);

    if (chunks.length === 0) {
      throw new Error("No content extracted from file");
    }

    // 4. Create knowledge points
    await prisma.knowledgePoint.createMany({
      data: chunks.map((chunk) => ({
        knowledgeBaseId,
        uploadId,
        content: chunk.text,
        metadata: chunk.metadata,
        status: "PENDING" as const,
      })),
    });

    // 5. Update upload status
    await prisma.knowledgeUpload.update({
      where: { id: uploadId },
      data: {
        status: "PENDING_REVIEW",
        pointCount: chunks.length,
      },
    });

    return { pointCount: chunks.length };
  } catch (error) {
    // Update upload as failed
    await prisma.knowledgeUpload.update({
      where: { id: uploadId },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    throw error; // Re-throw for BullMQ retry
  }
}
