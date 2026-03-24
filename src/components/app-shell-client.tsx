"use client";

import { SidebarProvider, useSidebar } from "@/components/sidebar-provider";
import { Sidebar } from "@/components/sidebar";
import { WhatsNewDialog } from "@/components/whats-new-dialog";
import { PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface ConversationItem {
  id: string;
  title: string | null;
  starred: boolean;
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

function MobileHeader() {
  const { isMobile, isOpen, open } = useSidebar();
  if (!isMobile || isOpen) return null;
  return (
    <header className="h-12 border-b flex items-center px-3 gap-2 shrink-0 bg-background">
      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={open}>
        <PanelLeft className="h-5 w-5" />
      </Button>
      <Link href="/" className="font-semibold text-sm">Falcon</Link>
    </header>
  );
}

export function AppShellClient({ conversations, user, children }: AppShellClientProps) {
  return (
    <SidebarProvider>
      <div className="h-full flex flex-col">
        <MobileHeader />
        <div className="flex-1 flex min-h-0">
          <Sidebar conversations={conversations} user={user} />
          <main className="flex-1 min-w-0 overflow-auto">
            {children}
          </main>
        </div>
      </div>
      <WhatsNewDialog />
    </SidebarProvider>
  );
}
