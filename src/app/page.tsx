import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageSquare, Plus, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="h-full overflow-auto bg-background">
      <Navbar user={session.user} />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">Dashboard</h2>
            <p className="text-muted-foreground">Your conversations and tools</p>
          </div>
          <Button asChild>
            <Link href="/studio">
              <Plus className="mr-2 h-4 w-4" />
              New Conversation
            </Link>
          </Button>
        </div>

        {conversations.length === 0 && tools.length === 0 && (
          <Card className="border-dashed">
            <CardHeader className="text-center">
              <CardTitle>Get Started</CardTitle>
              <CardDescription>
                Start a conversation to ask questions, explore data, or build tools
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-8">
              <Button asChild>
                <Link href="/studio">
                  <Plus className="mr-2 h-4 w-4" />
                  Open Studio
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {conversations.length > 0 && (
          <section className="mb-12">
            <h3 className="text-lg font-semibold mb-4">Recent Conversations</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {conversations.map((conv) => (
                <Link key={conv.id} href={`/studio?id=${conv.id}`}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg truncate">
                        <MessageSquare className="inline-block h-4 w-4 mr-2 text-muted-foreground" />
                        {conv.title || "Untitled"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(conv.updatedAt))}
                      </span>
                      {conv.tool && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          <Wrench className="h-3 w-3" />
                          Tool
                        </span>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {tools.length > 0 && (
          <section>
            <h3 className="text-lg font-semibold mb-4">My Tools</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
