import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isPlatformAdmin } from "@/lib/admin";
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
    select: { id: true, name: true, authorId: true },
  });

  if (!tool) notFound();

  const isOwner = tool.authorId === session.user.id;
  const isAdmin = isOwner ? false : await isPlatformAdmin(session.user.id);
  if (!isOwner && !isAdmin) notFound();

  return <ToolDataClient toolId={tool.id} toolName={tool.name} />;
}
