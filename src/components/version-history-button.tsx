"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { History, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

interface Snapshot {
  id: string;
  explanation: string | null;
  createdAt: string;
}

interface RestoredTool {
  id: string;
  code: string;
}

export function VersionHistoryButton({
  toolId,
  onRestored,
}: {
  toolId: string;
  onRestored?: (tool: RestoredTool) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [confirmSnapshot, setConfirmSnapshot] = useState<Snapshot | null>(null);
  const [restoring, setRestoring] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const loadSnapshots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tools/${toolId}/snapshots`);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = (await res.json()) as Snapshot[];
      setSnapshots(data);
    } catch {
      toast({
        title: "載入失敗",
        description: "無法取得版本歷史",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toolId, toast]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) loadSnapshots();
  };

  const handleRestore = async () => {
    if (!confirmSnapshot) return;
    setRestoring(true);
    try {
      const res = await fetch(
        `/api/tools/${toolId}/snapshots/${confirmSnapshot.id}/restore`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error(`${res.status}`);
      const tool = (await res.json()) as RestoredTool;
      toast({ title: "已還原至此版本" });
      setConfirmSnapshot(null);
      setOpen(false);
      onRestored?.(tool);
      router.refresh();
    } catch {
      toast({
        title: "還原失敗",
        description: "請稍後再試",
        variant: "destructive",
      });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="版本歷史"
          >
            <History className="h-3.5 w-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>版本歷史</DialogTitle>
            <DialogDescription>
              最近 20 筆修改紀錄。點「還原」可把工具切回該版本，還原前會先保存當前版本。
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                載入中
              </div>
            ) : snapshots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                尚無版本歷史
              </div>
            ) : (
              <ul className="space-y-2">
                {snapshots.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-start justify-between gap-2 p-3 rounded-md border text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium break-words">
                        {s.explanation || "(無說明)"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(s.createdAt).toLocaleString("zh-TW", {
                          hour12: false,
                        })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmSnapshot(s)}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      還原
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!confirmSnapshot}
        onOpenChange={(v) => !v && setConfirmSnapshot(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>還原到此版本？</DialogTitle>
            <DialogDescription>
              當前程式碼會被這個版本取代，當前版本會自動保存到歷史記錄，之後仍可還原回來。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmSnapshot(null)}
              disabled={restoring}
            >
              取消
            </Button>
            <Button onClick={handleRestore} disabled={restoring}>
              {restoring ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "還原"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
