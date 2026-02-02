"use client";

import { SidebarProvider } from "@/components/sidebar-provider";
import { TopBar } from "@/components/top-bar";
import { Sidebar } from "@/components/sidebar";

interface ConversationItem {
  id: string;
  title: string | null;
  updatedAt: string;
  hasTool: boolean;
}

interface AppShellClientProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  conversations: ConversationItem[];
  children: React.ReactNode;
}

export function AppShellClient({ user, conversations, children }: AppShellClientProps) {
  return (
    <SidebarProvider>
      <div className="h-full flex flex-col">
        <TopBar user={user} />
        <div className="flex-1 flex min-h-0">
          <Sidebar conversations={conversations} />
          <main className="flex-1 min-w-0 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
