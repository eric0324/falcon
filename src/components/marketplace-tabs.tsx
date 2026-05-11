"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Tabs } from "@/components/ui/tabs";

const VALID_TABS = new Set([
  "favorites",
  "trending",
  "top-rated",
  "most-used",
  "rising",
  "newest",
]);

interface MarketplaceTabsProps {
  defaultTab: string;
  className?: string;
  children: React.ReactNode;
}

export function MarketplaceTabs({
  defaultTab,
  className,
  children,
}: MarketplaceTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab");
  const initial = urlTab && VALID_TABS.has(urlTab) ? urlTab : defaultTab;
  const [value, setValue] = useState(initial);

  // Keep state in sync if the URL changes (e.g. browser back/forward)
  useEffect(() => {
    const next = urlTab && VALID_TABS.has(urlTab) ? urlTab : defaultTab;
    setValue(next);
  }, [urlTab, defaultTab]);

  const handleChange = (next: string) => {
    setValue(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === defaultTab) {
      params.delete("tab");
    } else {
      params.set("tab", next);
    }
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/", { scroll: false });
  };

  return (
    <Tabs value={value} onValueChange={handleChange} className={className}>
      {children}
    </Tabs>
  );
}
