"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Wrench, Database, Shield, FileText, ShieldCheck, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin/members", label: "使用者管理", icon: Users },
  { href: "/admin/tools", label: "工具管理", icon: Wrench },
  { href: "/admin/databases", label: "資料庫管理", icon: Database },
  { href: "/admin/groups", label: "群組管理", icon: Shield },
  { href: "/admin/scans", label: "弱點掃描", icon: ShieldCheck },
  { href: "/admin/logs", label: "稽核日誌", icon: FileText },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-white border-r border-neutral-200 flex flex-col shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200">
        <h1 className="font-semibold text-neutral-900">管理後台</h1>
      </div>

      {/* Navigation */}
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

      {/* Back to app */}
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
