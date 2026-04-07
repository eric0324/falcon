import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppShellClient } from "@/components/app-shell-client";

interface AppShellProps {
  children: React.ReactNode;
}

export async function AppShell({ children }: AppShellProps) {
  const session = await getSession();

  if (!session?.user?.email) {
    redirect("/login");
  }

  // Get user from database
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    redirect("/api/auth/signout?callbackUrl=/login");
  }

  // Fetch conversations for sidebar (exclude soft-deleted)
  const conversations = await prisma.conversation.findMany({
    where: {
      userId: user.id,
      deletedAt: null,
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      starred: true,
      updatedAt: true,
      tool: { select: { id: true } },
    },
  });

  const formattedConversations = conversations.map((conv) => ({
    id: conv.id,
    title: conv.title,
    starred: conv.starred,
    updatedAt: conv.updatedAt.toISOString(),
    hasTool: !!conv.tool,
  }));

  const userInfo = {
    name: user.name || session.user.name || "User",
    email: user.email,
    image: session.user.image || null,
  };

  return (
    <AppShellClient conversations={formattedConversations} user={userInfo}>
      {children}
    </AppShellClient>
  );
}
