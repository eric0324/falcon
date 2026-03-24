import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildVisibilityFilter } from "@/lib/tool-visibility";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import { UserAvatar } from "@/components/user-avatar";
import { ToolCard } from "@/components/tool-card";

interface ProfilePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, select: { name: true } });
  return { title: user ? `${user.name} - Profile` : "Profile" };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      image: true,
      department: true,
      createdAt: true,
    },
  });

  if (!user) {
    notFound();
  }

  const isOwner = session.user.id === user.id;

  const tools = await prisma.tool.findMany({
    where: {
      authorId: user.id,
      ...(isOwner ? {} : buildVisibilityFilter(session.user.id)),
    },
    orderBy: { updatedAt: "desc" },
  });

  const t = await getTranslations("profile");

  return (
    <div className="p-4 sm:p-6">
      {/* User Info */}
      <div className="flex items-center gap-4 mb-8">
        <UserAvatar src={user.image} name={user.name} size="lg" />
        <div>
          <h1 className="text-2xl font-bold">{user.name || t("anonymous")}</h1>
          <p className="text-sm text-muted-foreground">
            {user.department || t("noDepartment")} ·{" "}
            {t("joined", {
              time: formatDistanceToNow(new Date(user.createdAt), {
                addSuffix: true,
                locale: zhTW,
              }),
            })}
          </p>
        </div>
      </div>

      {/* Tools Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          {t("sharedTools")} ({tools.length})
        </h2>

        {tools.length === 0 ? (
          <p className="text-muted-foreground">{t("noTools")}</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} readOnly={!isOwner} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
