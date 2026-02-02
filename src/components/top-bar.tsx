"use client";

import Link from "next/link";
import { PanelLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/user-nav";
import { useSidebar } from "@/components/sidebar-provider";

interface TopBarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function TopBar({ user }: TopBarProps) {
  const { toggle } = useSidebar();

  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="h-8 w-8"
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="h-5 w-5" />
        </Button>
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-bold">Falcon</span>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
            Beta
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <Button asChild size="sm">
          <Link href="/studio">
            <Plus className="h-4 w-4 mr-1" />
            新對話
          </Link>
        </Button>
        <UserNav user={user} />
      </div>
    </header>
  );
}
