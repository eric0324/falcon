import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SidebarProvider } from "@/components/sidebar-provider";
import { TopBar } from "@/components/top-bar";
import { Sidebar } from "@/components/sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export async function AppShell({ children }: AppShellProps) {
  const session = await getServerSession(authOptions);

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

  // Fetch conversations for sidebar
  const conversations = await prisma.conversation.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      updatedAt: true,
      tool: { select: { id: true } },
    },
  });

  const formattedConversations = conversations.map((conv) => ({
    id: conv.id,
    title: conv.title,
    updatedAt: conv.updatedAt.toISOString(),
    hasTool: !!conv.tool,
  }));

  return (
    <SidebarProvider>
      <div className="h-full flex flex-col">
        <TopBar user={session.user} />
        <div className="flex-1 flex min-h-0">
          <Sidebar conversations={formattedConversations} />
          <main className="flex-1 min-w-0 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
