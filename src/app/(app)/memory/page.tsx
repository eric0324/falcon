import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { MemoryPageClient } from "./memory-page-client";

export const metadata = { title: "我的記憶" };

export default async function MemoryPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return <MemoryPageClient />;
}
