import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ToolRunner } from "@/components/tool-runner";

interface PublicToolPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PublicToolPageProps): Promise<Metadata> {
  const { id } = await params;
  const tool = await prisma.tool.findUnique({ where: { id }, select: { name: true } });
  return { title: tool?.name ?? "工具" };
}

export default async function PublicToolPage({ params }: PublicToolPageProps) {
  const { id } = await params;

  const tool = await prisma.tool.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      code: true,
      visibility: true,
      dataSources: true,
    },
  });

  if (!tool || tool.visibility !== "PUBLIC") {
    notFound();
  }

  // If tool uses external databases, show login prompt instead
  const dataSources = (tool.dataSources as string[] | null) ?? [];
  const hasExtDb = dataSources.some((ds) => ds.startsWith("extdb_"));

  if (hasExtDb) {
    return (
      <div className="h-dvh flex items-center justify-center">
        <div className="text-center max-w-md space-y-4">
          <h1 className="text-xl font-semibold">{tool.name}</h1>
          <p className="text-muted-foreground">
            此工具需要外部資料庫存取權限，請先登入後使用。
          </p>
          <a
            href={`/tool/${tool.id}`}
            className="inline-flex items-center justify-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            登入使用
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col">
      {/* Minimal header */}
      <header className="border-b px-4 py-3 shrink-0">
        <h1 className="font-semibold">{tool.name}</h1>
        {tool.description && (
          <p className="text-sm text-muted-foreground">{tool.description}</p>
        )}
      </header>

      {/* Tool Runner — no toolId to prevent bridge API calls */}
      <div className="flex-1 overflow-hidden">
        <ToolRunner code={tool.code} />
      </div>
    </div>
  );
}
