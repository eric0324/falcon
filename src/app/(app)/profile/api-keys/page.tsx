import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ApiKeysClient } from "./api-keys-client";

export const metadata = { title: "API Keys" };

export default async function ApiKeysPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login");
  }
  return <ApiKeysClient />;
}
