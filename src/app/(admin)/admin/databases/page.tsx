import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Pagination } from "../pagination";
import { DatabaseForm } from "./database-form";

const PAGE_SIZE = 10;

function formatDate(date: Date | null): string {
  if (!date) return "尚未掃描";
  return new Date(date).toLocaleDateString("zh-TW", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const typeLabel: Record<string, string> = {
  POSTGRESQL: "PostgreSQL",
  MYSQL: "MySQL",
};

export default async function AdminDatabasesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page || "1", 10) || 1);

  const [databases, totalCount] = await Promise.all([
    prisma.externalDatabase.findMany({
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        type: true,
        host: true,
        port: true,
        database: true,
        lastSyncedAt: true,
        _count: { select: { tables: true } },
      },
    }),
    prisma.externalDatabase.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">資料庫管理</h1>
          <p className="text-muted-foreground mt-1">
            共 {totalCount} 個外部資料庫連線
          </p>
        </div>
        <DatabaseForm />
      </div>

      {databases.length === 0 && currentPage === 1 ? (
        <div className="border rounded-lg p-12 text-center text-muted-foreground">
          尚未新增任何外部資料庫連線
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">名稱</th>
                <th className="text-left p-3 font-medium">類型</th>
                <th className="text-left p-3 font-medium">連線位址</th>
                <th className="text-right p-3 font-medium">資料表數</th>
                <th className="text-right p-3 font-medium">最後掃描</th>
              </tr>
            </thead>
            <tbody>
              {databases.map((db) => (
                <tr key={db.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-3">
                    <Link
                      href={`/admin/databases/${db.id}`}
                      className="font-medium hover:underline"
                    >
                      {db.name}
                    </Link>
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-700">
                      {typeLabel[db.type] || db.type}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground text-sm font-mono">
                    {db.host}:{db.port}/{db.database}
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    {db._count.tables}
                  </td>
                  <td className="p-3 text-right text-muted-foreground text-sm">
                    {formatDate(db.lastSyncedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} basePath="/admin/databases" />
    </div>
  );
}
