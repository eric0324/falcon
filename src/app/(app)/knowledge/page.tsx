import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { KnowledgePageClient } from "./knowledge-page-client";

export const metadata = { title: "知識庫" };

export default async function KnowledgePage() {
  const session = await getSession();

  if (!session?.user?.email) {
    redirect("/login");
  }

  return <KnowledgePageClient />;
}
