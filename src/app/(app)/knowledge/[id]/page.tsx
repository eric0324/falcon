import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { KnowledgeDetailClient } from "./knowledge-detail-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function KnowledgeDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const { id } = await params;
  return <KnowledgeDetailClient knowledgeBaseId={id} />;
}
