import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canUserAccessTool } from "@/lib/tool-visibility";
import { ToolDataClient } from "./client";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const tool = await prisma.tool.findUnique({ where: { id }, select: { name: true } });
  return { title: tool ? `${tool.name} - 資料表` : "資料表" };
}

export default async function ToolDataPage({ params }: Props) {
  const session = await getSession();
  const { id } = await params;

  if (!session?.user?.id) {
    redirect("/login");
  }

  const tool = await prisma.tool.findUnique({
    where: { id },
    select: { id: true, name: true, authorId: true, visibility: true, status: true },
  });

  if (!tool) notFound();

  const canAccess = await canUserAccessTool(tool, session.user.id);
  if (!canAccess) notFound();

  return <ToolDataClient toolId={tool.id} toolName={tool.name} />;
}
