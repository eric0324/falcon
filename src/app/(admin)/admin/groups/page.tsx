import { prisma } from "@/lib/prisma";
import { GroupManager } from "./group-manager";

export const metadata = { title: "群組管理" };

export default async function AdminGroupsPage() {
  const groups = await prisma.group.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: { select: { users: true } },
    },
  });

  const initialGroups = groups.map((r) => ({
    id: r.id,
    name: r.name,
    createdAt: r.createdAt.toISOString(),
    userCount: r._count.users,
  }));

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">群組管理</h1>
        <p className="text-muted-foreground mt-1">
          管理群組，用於控制外部資料庫的存取權限
        </p>
      </div>
      <GroupManager initialGroups={initialGroups} />
    </div>
  );
}
