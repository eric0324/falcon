import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { ApiKeysClient } from "./api-keys-client";

export const metadata = { title: "API Keys" };

export default async function ApiKeysPage() {
  const session = await getSession();
  if (!session?.user?.email) {
    redirect("/login");
  }
  return <ApiKeysClient />;
}
