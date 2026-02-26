import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canUserAccessTool } from "@/lib/tool-visibility";
import { ArrowLeft, Pencil, Info, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolRunner } from "@/components/tool-runner";
import { ToolUsageTracker } from "@/components/tool-usage-tracker";

interface ToolPageProps {
  params: Promise<{ id: string }>;
}

export default async function ToolPage({ params }: ToolPageProps) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  const tool = await prisma.tool.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!tool) {
    notFound();
  }

  // Check access based on visibility
  if (session?.user?.id) {
    const hasAccess = await canUserAccessTool(tool, session.user.id);
    if (!hasAccess) notFound();
  } else if (tool.visibility !== "PUBLIC") {
    notFound();
  }

  const isOwner = tool.authorId === session?.user?.id;

  // extdb permission pre-check
  const dataSources = (tool.dataSources as string[] | null) ?? [];
  const extDbIds = dataSources
    .filter((ds) => ds.startsWith("extdb_"))
    .map((ds) => ds.replace("extdb_", ""));

  let extDbBlocked = false;

  if (extDbIds.length > 0 && !isOwner) {
    if (!session?.user?.id) {
      extDbBlocked = true;
    } else {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { groups: { select: { id: true } } },
      });
      const roleIds = user?.groups.map((r) => r.id) ?? [];

      if (roleIds.length === 0) {
        extDbBlocked = true;
      } else {
        // Check each extdb database — user needs at least one accessible table per database
        for (const dbId of extDbIds) {
          const accessibleCount = await prisma.externalDatabaseTable.count({
            where: {
              databaseId: dbId,
              hidden: false,
              allowedGroups: { some: { id: { in: roleIds } } },
            },
          });
          if (accessibleCount === 0) {
            extDbBlocked = true;
            break;
          }
        }
      }
    }
  }

  if (extDbBlocked) {
    return (
      <div className="h-full flex flex-col">
        <header className="border-b px-4 py-3 flex items-center shrink-0">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md space-y-4">
            <ShieldX className="h-12 w-12 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-semibold">無法使用此工具</h2>
            <p className="text-muted-foreground">
              此工具需要外部資料庫存取權限，請聯繫工具建立者 {tool.author.name} 了解更多。
            </p>
            <Button asChild>
              <Link href="/">返回首頁</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="border-b px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="font-semibold">{tool.name}</h1>
            {tool.description && (
              <p className="text-sm text-muted-foreground">{tool.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/tool/${tool.id}/details`}>
              <Info className="h-4 w-4 mr-2" />
              詳情
            </Link>
          </Button>
          {isOwner && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/chat?edit=${tool.id}`}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
          )}
        </div>
      </header>

      {/* Tool Runner */}
      <div className="flex-1 overflow-hidden">
        <ToolRunner code={tool.code} toolId={tool.id} />
      </div>

      {/* Usage Tracker */}
      <ToolUsageTracker toolId={tool.id} source="DIRECT" />
    </div>
  );
}
