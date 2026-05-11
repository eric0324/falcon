"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

interface SearchInputProps {
  /** Page path without query string, e.g. "/admin/tools" */
  basePath: string;
  /** Initial value read from server-side searchParams */
  initialValue?: string;
  /** Other URL params to preserve (without `q` and `page`) */
  extraParams?: Record<string, string | undefined>;
  /** Placeholder text */
  placeholder?: string;
}

export function SearchInput({
  basePath,
  initialValue = "",
  extraParams = {},
  placeholder = "搜尋",
}: SearchInputProps) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const lastPushedRef = useRef(initialValue);

  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed === lastPushedRef.current.trim()) return;

    const timer = setTimeout(() => {
      lastPushedRef.current = trimmed;
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(extraParams)) {
        if (v) params.set(k, v);
      }
      if (trimmed) params.set("q", trimmed);
      const qs = params.toString();
      router.push(`${basePath}${qs ? `?${qs}` : ""}`);
    }, 300);

    return () => clearTimeout(timer);
  }, [value, basePath, extraParams, router]);

  return (
    <div className="relative max-w-xs">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full border rounded-md pl-8 pr-8 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="清除搜尋"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
