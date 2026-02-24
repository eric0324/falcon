import { prisma } from "@/lib/prisma";
import { RoleManager } from "./role-manager";

export default async function AdminRolesPage() {
  const roles = await prisma.companyRole.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: { select: { users: true } },
    },
  });

  const initialRoles = roles.map((r) => ({
    id: r.id,
    name: r.name,
    createdAt: r.createdAt.toISOString(),
    userCount: r._count.users,
  }));

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">角色管理</h1>
        <p className="text-muted-foreground mt-1">
          管理公司角色，用於控制外部資料庫的存取權限
        </p>
      </div>
      <RoleManager initialRoles={initialRoles} />
    </div>
  );
}
