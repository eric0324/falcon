import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "@/components/login-form";

export const metadata = { title: "登入" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; domain?: string; callbackUrl?: string }>;
}) {
  const session = await getSession();
  const params = await searchParams;

  if (session) {
    redirect(params.callbackUrl || "/");
  }

  return <LoginForm error={params.error} domain={params.domain} callbackUrl={params.callbackUrl} />;
}
