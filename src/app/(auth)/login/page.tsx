import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; domain?: string; callbackUrl?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;

  if (session) {
    redirect(params.callbackUrl || "/");
  }

  return <LoginForm error={params.error} domain={params.domain} callbackUrl={params.callbackUrl} />;
}
