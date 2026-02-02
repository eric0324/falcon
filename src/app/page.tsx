import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageSquare, Plus, Wrench, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolCard } from "@/components/tool-card";
import { Navbar } from "@/components/navbar";
import { formatDistanceToNow } from "@/lib/format";

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

  const [tools, conversations] = await Promise.all([
    prisma.tool.findMany({
      where: { authorId: user.id },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.conversation.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        tool: { select: { id: true } },
      },
    }),
  ]);

  return (
    <div className="h-full overflow-auto dashboard-bg">
      <Navbar user={session.user} />

      <main className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground mt-1">管理你的對話和工具</p>
          </div>
          <Button asChild size="lg" className="shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300">
            <Link href="/studio">
              <Plus className="mr-2 h-4 w-4" />
              開始新對話
            </Link>
          </Button>
        </div>

        {/* Empty State */}
        {conversations.length === 0 && tools.length === 0 && (
          <div className="glass-card p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-2xl font-semibold mb-3">歡迎來到 Falcon</h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              開始你的第一個對話，探索資料、回答問題，或打造屬於你的小工具
            </p>
            <Button asChild size="lg" className="shadow-lg shadow-primary/25">
              <Link href="/studio">
                開始使用
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}

        {/* Recent Conversations */}
        {conversations.length > 0 && (
          <section className="mb-16">
            <h3 className="text-xl font-semibold mb-6">最近對話</h3>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {conversations.map((conv) => (
                <Link key={conv.id} href={`/studio?id=${conv.id}`}>
                  <div className="glass-card glass-card-hover p-6 h-full">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">
                          {conv.title || "Untitled"}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(conv.updatedAt))}
                        </p>
                      </div>
                    </div>
                    {conv.tool && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-primary bg-primary/10 px-3 py-1 rounded-full">
                        <Wrench className="h-3 w-3" />
                        已建立工具
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* My Tools */}
        {tools.length > 0 && (
          <section>
            <h3 className="text-xl font-semibold mb-6">我的工具</h3>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {tools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
