"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeleteDatabaseButton({
  databaseId,
  databaseName,
}: {
  databaseId: string;
  databaseName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/databases/${databaseId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/admin/databases");
      }
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-red-600">
          確定刪除「{databaseName}」？
        </span>
        <Button
          size="sm"
          variant="destructive"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? "刪除中..." : "確定刪除"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setConfirming(false)}
          disabled={deleting}
        >
          取消
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="text-red-600 hover:text-red-700 hover:bg-red-50"
      onClick={() => setConfirming(true)}
    >
      <Trash2 className="h-4 w-4 mr-1" />
      刪除
    </Button>
  );
}
