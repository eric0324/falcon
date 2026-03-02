import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canUserAccessTool } from "@/lib/tool-visibility";
import { ArrowLeft, Pencil, Info, AlertTriangle } from "lucide-react";
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

  // Fetch latest scan for this tool
  const latestScan = await prisma.codeScan.findFirst({
    where: { toolId: id },
    orderBy: { scannedAt: "desc" },
    select: { status: true, findings: true },
  });

  const scanFindings = (latestScan?.findings ?? []) as Array<{
    severity: string;
    message: string;
  }>;
  const warningCount = scanFindings.filter(
    (f) => f.severity === "warning" || f.severity === "critical"
  ).length;

  return (
    <div className="h-full flex flex-col">
      {/* Scan warning banner */}
      {latestScan && latestScan.status !== "PASS" && (
        <div
          className={`px-4 py-2 flex items-start gap-2 text-sm border-b ${
            latestScan.status === "FAIL"
              ? "bg-red-50 text-red-800 border-red-200"
              : "bg-yellow-50 text-yellow-800 border-yellow-200"
          }`}
        >
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <span className="font-medium">
              {latestScan.status === "FAIL"
                ? "此工具有安全問題"
                : `此工具有 ${warningCount} 個警告`}
            </span>
            <span className="ml-2 text-xs opacity-75">
              {scanFindings
                .filter((f) => f.severity !== "info")
                .slice(0, 3)
                .map((f) => f.message)
                .join("、")}
            </span>
          </div>
        </div>
      )}

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
