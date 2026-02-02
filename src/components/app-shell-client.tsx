"use client";

import { SidebarProvider } from "@/components/sidebar-provider";
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
      <div className="h-full flex">
        <Sidebar conversations={conversations} user={user} />
        <main className="flex-1 min-w-0 overflow-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
