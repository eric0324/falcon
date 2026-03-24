import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { Pagination } from "../pagination";
import { ScanList } from "./scan-list";

export const metadata = { title: "弱點掃描" };

const PAGE_SIZE = 20;

export default async function AdminScansPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const statusFilter = params.status || undefined;

  const where: Prisma.CodeScanWhereInput = {};
  if (statusFilter && ["PASS", "WARN", "FAIL"].includes(statusFilter)) {
    where.status = statusFilter as "PASS" | "WARN" | "FAIL";
  }

  const [scans, totalCount] = await Promise.all([
    prisma.codeScan.findMany({
      where,
      orderBy: { scannedAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
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

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const filterParams = new URLSearchParams();
  if (statusFilter) filterParams.set("status", statusFilter);
  const qs = filterParams.toString();
  const basePath = `/admin/scans${qs ? `?${qs}` : ""}`;

  const serialized = scans.map((s) => ({
    id: s.id,
    toolId: s.toolId,
    toolName: s.tool.name,
    authorName: s.tool.author.name || s.tool.author.email,
    status: s.status,
    findings: s.findings as Array<{
      severity: string;
      category: string;
      rule: string;
      message: string;
      line?: number;
      snippet?: string;
    }>,
    llmSummary: s.llmSummary,
    scannedAt: s.scannedAt.toISOString(),
  }));

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">弱點掃描</h1>
        <p className="text-muted-foreground mt-1">共 {totalCount} 筆掃描紀錄</p>
      </div>

      <ScanList
        scans={serialized}
        currentStatus={statusFilter}
      />

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        basePath={basePath}
      />
    </div>
  );
}
