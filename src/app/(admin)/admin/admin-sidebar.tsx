"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Users, Wrench, Database, Shield, FileText, ShieldCheck, Settings, ArrowLeft, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const MOBILE_BREAKPOINT = 768;

const navItems = [
  { href: "/admin/members", label: "使用者管理", icon: Users },
  { href: "/admin/tools", label: "工具管理", icon: Wrench },
  { href: "/admin/databases", label: "資料庫管理", icon: Database },
  { href: "/admin/groups", label: "群組管理", icon: Shield },
  { href: "/admin/scans", label: "弱點掃描", icon: ShieldCheck },
  { href: "/admin/logs", label: "稽核日誌", icon: FileText },
  { href: "/admin/settings", label: "系統設定", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (mobile) setIsOpen(false);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Close on navigation (mobile)
  useEffect(() => {
    if (isMobile) setIsOpen(false);
  }, [pathname, isMobile]);

  // Mobile: header bar + overlay sidebar
  if (isMobile) {
    return (
      <>
        {/* Mobile header */}
        {!isOpen && (
          <header className="h-12 border-b flex items-center px-3 gap-2 shrink-0 bg-background">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setIsOpen(true)}>
              <PanelLeft className="h-5 w-5" />
            </Button>
            <span className="font-semibold text-sm">管理後台</span>
          </header>
        )}

        {/* Overlay */}
        {isOpen && (
          <>
            <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setIsOpen(false)} />
            <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-neutral-200 flex flex-col z-50">
              <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
                <h1 className="font-semibold text-neutral-900">管理後台</h1>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                  <PanelLeft className="h-4 w-4" />
                </Button>
              </div>
              <nav className="flex-1 p-3 space-y-0.5">
                {navItems.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                        isActive
                          ? "bg-neutral-100 text-neutral-900 font-medium"
                          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="p-3 border-t border-neutral-200">
                <Link
                  href="/chat"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  回到主應用
                </Link>
              </div>
            </aside>
          </>
        )}
      </>
    );
  }

  // Desktop: static sidebar
  return (
    <aside className="w-56 bg-white border-r border-neutral-200 flex flex-col shrink-0">
      <div className="p-4 border-b border-neutral-200">
        <h1 className="font-semibold text-neutral-900">管理後台</h1>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-neutral-100 text-neutral-900 font-medium"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-neutral-200">
        <Link
          href="/chat"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          回到主應用
        </Link>
      </div>
    </aside>
  );
}
