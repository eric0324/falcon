import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { KnowledgeSettingsClient } from "./knowledge-settings-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function KnowledgeSettingsPage({ params }: PageProps) {
  const session = await getSession();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const { id } = await params;
  return <KnowledgeSettingsClient knowledgeBaseId={id} />;
}
