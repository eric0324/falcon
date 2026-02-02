"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { UserNav } from "./user-nav";

interface NavbarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/marketplace", label: "探索市集" },
    { href: "/", label: "我的工具", exact: true },
  ];

  return (
    <header className="sticky top-0 z-50 glass-navbar">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between max-w-6xl">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <h1 className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors">Falcon</h1>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              Beta
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm px-4 py-2 rounded-lg transition-all duration-200",
                    isActive
                      ? "font-medium text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        {user && <UserNav user={user} />}
      </div>
    </header>
  );
}
