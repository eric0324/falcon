"use client";

import { SidebarProvider } from "@/components/sidebar-provider";
import { Sidebar } from "@/components/sidebar";

interface ConversationItem {
  id: string;
  title: string | null;
  updatedAt: string;
  hasTool: boolean;
}

interface UserInfo {
  name: string;
  email: string;
  image: string | null;
}

interface AppShellClientProps {
  conversations: ConversationItem[];
  user: UserInfo;
  children: React.ReactNode;
}

export function AppShellClient({ conversations, user, children }: AppShellClientProps) {
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
