import { getSession } from "@/lib/session";
import { notFound, redirect } from "next/navigation";
import { getKnowledgeBaseRole, hasMinRole } from "@/lib/knowledge/permissions";
import { KnowledgeSettingsClient } from "./knowledge-settings-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function KnowledgeSettingsPage({ params }: PageProps) {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;
  const role = await getKnowledgeBaseRole(id, session.user.id);
  if (!role) {
    notFound();
  }
  if (!hasMinRole(role, "ADMIN")) {
    redirect(`/knowledge/${id}`);
  }

  return <KnowledgeSettingsClient knowledgeBaseId={id} />;
}
