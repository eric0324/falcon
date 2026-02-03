import { getServerSession } from "next-auth";
import { getTranslations } from "next-intl/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToolCard } from "@/components/tool-card";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  // Get user from database by email
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    // User in JWT but not in DB - redirect to signout to clear stale session
    redirect("/api/auth/signout?callbackUrl=/login");
  }

  const tools = await prisma.tool.findMany({
    where: { authorId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  const t = await getTranslations("myTools");

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold">{t("title")}</h2>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Button asChild>
          <Link href="/chat">
            <Plus className="mr-2 h-4 w-4" />
            {t("newChat")}
          </Link>
        </Button>
      </div>

      {tools.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <CardTitle>{t("getStarted")}</CardTitle>
            <CardDescription>
              {t("getStartedDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Button asChild>
              <Link href="/chat">
                <Plus className="mr-2 h-4 w-4" />
                {t("openStudio")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      )}
    </div>
  );
}
