import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { Pagination } from "../pagination";
import { LogFilters } from "./log-filters";
import { LogDetailRow } from "./log-detail-row";

const PAGE_SIZE = 20;

function formatDate(date: Date): string {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    user?: string;
    source?: string;
    ds?: string;
    status?: string;
  }>;
}) {
  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page || "1", 10) || 1);

  const userFilter = params.user || undefined;
  const sourceFilter = params.source || undefined;
  const dsFilter = params.ds || undefined;
  const statusFilter = params.status || undefined;

  const where: Prisma.DataSourceLogWhereInput = {};
  if (userFilter) where.userId = userFilter;
  if (sourceFilter) where.source = sourceFilter;
  if (dsFilter) where.dataSourceId = dsFilter;
  if (statusFilter === "success") where.success = true;
  if (statusFilter === "error") where.success = false;

  const [logs, totalCount, users, dataSourceRows] = await Promise.all([
    prisma.dataSourceLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.dataSourceLog.count({ where }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.dataSourceLog.findMany({
      distinct: ["dataSourceId"],
      select: { dataSourceId: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const dataSources = dataSourceRows.map((r) => r.dataSourceId);

  // Build basePath with current filters for pagination
  const filterParams = new URLSearchParams();
  if (userFilter) filterParams.set("user", userFilter);
  if (sourceFilter) filterParams.set("source", sourceFilter);
  if (dsFilter) filterParams.set("ds", dsFilter);
  if (statusFilter) filterParams.set("status", statusFilter);
  const qs = filterParams.toString();
  const basePath = `/admin/logs${qs ? `?${qs}` : ""}`;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">稽核日誌</h1>
        <p className="text-muted-foreground mt-1">
          共 {totalCount} 筆紀錄
        </p>
      </div>

      <LogFilters
        users={users}
        dataSources={dataSources}
        current={{
          user: userFilter,
          source: sourceFilter,
          ds: dsFilter,
          status: statusFilter,
        }}
      />

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">時間</th>
              <th className="text-left p-3 font-medium">使用者</th>
              <th className="text-left p-3 font-medium">呼叫方式</th>
              <th className="text-left p-3 font-medium">資料來源</th>
              <th className="text-left p-3 font-medium">工具</th>
              <th className="text-left p-3 font-medium">狀態</th>
              <th className="text-right p-3 font-medium">耗時</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  沒有符合條件的日誌紀錄
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <LogDetailRow
                  key={log.id}
                  log={{
                    id: log.id,
                    createdAt: formatDate(log.createdAt),
                    userName: log.user.name || log.user.email,
                    source: log.source,
                    dataSourceId: log.dataSourceId,
                    action: log.action,
                    toolName: log.toolName,
                    success: log.success,
                    durationMs: log.durationMs,
                    rowCount: log.rowCount,
                    params: log.params,
                    response: log.response,
                    error: log.error,
                    conversationId: log.conversationId,
                    toolId: log.toolId,
                  }}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        basePath={basePath}
      />
    </div>
  );
}
