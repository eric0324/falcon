import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";
import { AdminToolEditForm } from "./admin-tool-edit-form";
import { SnapshotList } from "./snapshot-list";

export const metadata = { title: "工具編輯（管理員）" };

export default async function AdminToolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) {
    notFound();
  }

  const { id } = await params;

  const tool = await prisma.tool.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      code: true,
      visibility: true,
      status: true,
      category: true,
      tags: true,
      createdAt: true,
      updatedAt: true,
      author: {
        select: { id: true, name: true, email: true, image: true },
      },
      stats: {
        select: { totalUsage: true, weeklyUsage: true },
      },
      snapshots: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, explanation: true, createdAt: true },
      },
    },
  });

  if (!tool) {
    notFound();
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl">
      <div className="mb-4">
        <Link
          href="/admin/tools"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          返回工具列表
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">{tool.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          作者：
          <Link
            href={`/admin/members/${tool.author.id}`}
            className="hover:underline"
          >
            {tool.author.name || tool.author.email}
          </Link>
          {" · "}
          建立於 {new Date(tool.createdAt).toLocaleString("zh-TW")}
          {" · "}
          使用量 {tool.stats?.totalUsage ?? 0}
        </p>
      </div>

      <AdminToolEditForm
        toolId={tool.id}
        initialName={tool.name}
        initialDescription={tool.description ?? ""}
        initialCode={tool.code}
        initialVisibility={tool.visibility}
        initialStatus={tool.status}
      />

      <div className="mt-8 border-t pt-6">
        <h2 className="text-base font-semibold mb-3">最近版本（最多 10 筆）</h2>
        <SnapshotList
          toolId={tool.id}
          initialSnapshots={tool.snapshots.map((s) => ({
            ...s,
            createdAt: s.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
