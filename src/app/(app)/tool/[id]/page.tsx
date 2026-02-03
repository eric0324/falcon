import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ArrowLeft, Pencil, Info } from "lucide-react";
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

  // Check access
  if (tool.visibility === "PRIVATE" && tool.authorId !== session?.user?.id) {
    notFound();
  }

  const isOwner = tool.authorId === session?.user?.id;

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
