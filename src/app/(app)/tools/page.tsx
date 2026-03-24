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

export const metadata = { title: "我的工具" };

export default async function ToolsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    redirect("/api/auth/signout?callbackUrl=/login");
  }

  const tools = await prisma.tool.findMany({
    where: { authorId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  const t = await getTranslations("myTools");

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6 sm:mb-8 gap-4">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold">{t("title")}</h2>
          <p className="text-muted-foreground text-sm sm:text-base">{t("description")}</p>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/chat">
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t("newChat")}</span>
            <span className="sm:hidden">新增</span>
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
