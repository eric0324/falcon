import { getSession } from "@/lib/session";
import { notFound, redirect } from "next/navigation";
import { getKnowledgeBaseRole } from "@/lib/knowledge/permissions";
import { KnowledgeDetailClient } from "./knowledge-detail-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function KnowledgeDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;
  const role = await getKnowledgeBaseRole(id, session.user.id);
  if (!role) {
    notFound();
  }

  return <KnowledgeDetailClient knowledgeBaseId={id} />;
}
