import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DatabaseForm } from "../database-form";
import { TestConnectionButton } from "./test-connection-button";
import { DeleteDatabaseButton } from "./delete-database-button";
import { SchemaBrowser } from "./schema-browser";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const db = await prisma.externalDatabase.findUnique({ where: { id }, select: { name: true } });
  return { title: db ? `${db.name} - 資料庫` : "資料庫詳情" };
}

const typeLabel: Record<string, string> = {
  POSTGRESQL: "PostgreSQL",
  MYSQL: "MySQL",
};

function formatDate(date: Date | null): string {
  if (!date) return "尚未掃描";
  return new Date(date).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminDatabaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [db, allRoles] = await Promise.all([
    prisma.externalDatabase.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        type: true,
        host: true,
        port: true,
        database: true,
        username: true,
        sslEnabled: true,
        lastSyncedAt: true,
        tables: {
          orderBy: { tableName: "asc" },
          select: {
            id: true,
            tableName: true,
            note: true,
            hidden: true,
            allowedGroups: { select: { id: true, name: true } },
            columns: {
              orderBy: { columnName: "asc" },
              select: {
                id: true,
                columnName: true,
                dataType: true,
                isNullable: true,
                isPrimaryKey: true,
                note: true,
                allowedGroups: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    }),
    prisma.group.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!db) notFound();

  return (
    <div className="p-4 sm:p-6">
      <Link
        href="/admin/databases"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        返回資料庫列表
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{db.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-700">
              {typeLabel[db.type] || db.type}
            </span>
            <span className="font-mono">{db.host}:{db.port}/{db.database}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            最後掃描：{formatDate(db.lastSyncedAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TestConnectionButton databaseId={db.id} />
          <DeleteDatabaseButton databaseId={db.id} databaseName={db.name} />
          <DatabaseForm
            initialData={{
            id: db.id,
            name: db.name,
            type: db.type,
            host: db.host,
            port: db.port,
            database: db.database,
            username: db.username,
            sslEnabled: db.sslEnabled,
          }}
        />
        </div>
      </div>

      {/* Schema Browser */}
      <SchemaBrowser databaseId={db.id} tables={db.tables} allRoles={allRoles} />
    </div>
  );
}
