"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Snapshot {
  id: string;
  explanation: string | null;
  createdAt: string;
}

export function SnapshotList({
  toolId,
  initialSnapshots,
}: {
  toolId: string;
  initialSnapshots: Snapshot[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (initialSnapshots.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">尚無版本紀錄</p>
    );
  }

  async function handleDelete(snapshotId: string) {
    if (!confirm("確定要刪除這筆版本紀錄嗎？刪除後無法救回，也無法用它還原。")) {
      return;
    }

    setDeletingId(snapshotId);
    try {
      const res = await fetch(
        `/api/admin/tools/${toolId}/snapshots/${snapshotId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({
          title: "刪除失敗",
          description: err.error || `HTTP ${res.status}`,
          variant: "destructive",
        });
        return;
      }
      toast({ title: "已刪除版本紀錄" });
      router.refresh();
    } catch (err) {
      toast({
        title: "刪除失敗",
        description: err instanceof Error ? err.message : "網路錯誤",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <ul className="space-y-2 text-sm">
      {initialSnapshots.map((s) => (
        <li
          key={s.id}
          className="flex items-start gap-3 group"
        >
          <span
            className="text-muted-foreground tabular-nums shrink-0"
            suppressHydrationWarning
          >
            {new Date(s.createdAt).toLocaleString("zh-TW")}
          </span>
          <span className="text-muted-foreground flex-1">
            {s.explanation || "（無說明）"}
          </span>
          <button
            type="button"
            onClick={() => handleDelete(s.id)}
            disabled={deletingId === s.id}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-600 disabled:opacity-50"
            title="刪除這筆版本紀錄"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
