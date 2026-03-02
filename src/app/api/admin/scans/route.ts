import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const PAGE_SIZE = 20;

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

    const where: Prisma.CodeScanWhereInput = {};
    if (status && ["PASS", "WARN", "FAIL"].includes(status)) {
      where.status = status as "PASS" | "WARN" | "FAIL";
    }

    const [scans, totalCount] = await Promise.all([
      prisma.codeScan.findMany({
        where,
        orderBy: { scannedAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          tool: {
            select: {
              id: true,
              name: true,
              author: {
                select: { name: true, email: true },
              },
            },
          },
        },
      }),
      prisma.codeScan.count({ where }),
    ]);

    return NextResponse.json({
      scans,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
      page,
    });
  } catch (error) {
    console.error("GET /api/admin/scans error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
