import { prisma } from "@/lib/prisma";
import { TOOL_CATEGORIES } from "@/lib/categories";
import { ToolDetailPanel } from "./tool-detail-panel";
import { Pagination } from "../pagination";

const PAGE_SIZE = 10;

const categoryLabelMap: Record<string, string> = Object.fromEntries(
  TOOL_CATEGORIES.map((c) => [c.id, ""])
);
// Build from zh-TW labels directly
categoryLabelMap["productivity"] = "生產力工具";
categoryLabelMap["data"] = "數據分析";
categoryLabelMap["finance"] = "財務會計";
categoryLabelMap["hr"] = "人資管理";
categoryLabelMap["marketing"] = "行銷業務";
categoryLabelMap["design"] = "設計創意";
categoryLabelMap["other"] = "其他";

function getCategoryLabel(category: string | null): string {
  if (!category) return "-";
  return categoryLabelMap[category] || category;
}

const visibilityLabel: Record<string, { text: string; className: string }> = {
  PRIVATE: { text: "私人", className: "bg-neutral-100 text-neutral-600" },
  DEPARTMENT: { text: "部門", className: "bg-blue-100 text-blue-700" },
  COMPANY: { text: "公司", className: "bg-green-100 text-green-700" },
  PUBLIC: { text: "公開", className: "bg-purple-100 text-purple-700" },
};

export default async function AdminToolsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page || "1", 10) || 1);

  const [tools, totalCount] = await Promise.all([
    prisma.tool.findMany({
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        description: true,
        visibility: true,
        category: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, name: true, email: true, image: true } },
        stats: {
          select: {
            totalUsage: true,
            weeklyUsage: true,
            totalReviews: true,
            averageRating: true,
            weightedRating: true,
          },
        },
      },
    }),
    prisma.tool.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">工具管理</h1>
        <p className="text-muted-foreground mt-1">
          共 {totalCount} 個工具
        </p>
      </div>

      {tools.length === 0 && currentPage === 1 ? (
        <div className="border rounded-lg p-12 text-center text-muted-foreground">
          目前沒有任何工具
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">工具名稱</th>
                <th className="text-left p-3 font-medium">作者</th>
                <th className="text-left p-3 font-medium">可見度</th>
                <th className="text-left p-3 font-medium">分類</th>
                <th className="text-right p-3 font-medium">使用量</th>
                <th className="text-right p-3 font-medium">評分</th>
                <th className="text-right p-3 font-medium">建立時間</th>
              </tr>
            </thead>
            <tbody>
              {tools.map((tool) => {
                const vis = visibilityLabel[tool.visibility] ?? {
                  text: tool.visibility,
                  className: "bg-neutral-100 text-neutral-600",
                };

                return (
                  <ToolDetailPanel
                    key={tool.id}
                    tool={{
                      id: tool.id,
                      name: tool.name,
                      description: tool.description,
                      visibility: vis,
                      category: getCategoryLabel(tool.category),
                      tags: tool.tags,
                      totalUsage: tool.stats?.totalUsage ?? 0,
                      rating: tool.stats?.averageRating ?? 0,
                      reviewCount: tool.stats?.totalReviews ?? 0,
                      createdAt: tool.createdAt.toISOString(),
                      author: tool.author,
                    }}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} basePath="/admin/tools" />
    </div>
  );
}
