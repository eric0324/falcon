"use client";

import { useEffect, useState, useCallback } from "react";
import { Pencil, Trash2, Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

type MemoryType = "PREFERENCE" | "CONTEXT" | "RULE" | "FACT";

interface Memory {
  id: string;
  type: MemoryType;
  title: string;
  content: string;
  source: "EXPLICIT" | "SUGGESTED";
  confidence: "HIGH" | "MEDIUM";
  createdAt: string;
  updatedAt: string;
}

const TYPE_LABEL: Record<MemoryType, string> = {
  PREFERENCE: "偏好",
  CONTEXT: "背景",
  RULE: "規則",
  FACT: "事實",
};

const TYPE_ORDER: MemoryType[] = ["RULE", "CONTEXT", "PREFERENCE", "FACT"];

export function MemoryPageClient() {
  const { toast } = useToast();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Memory | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Memory | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/memory");
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();
      setMemories(data);
    } catch (e) {
      console.error(e);
      toast({ title: "載入記憶失敗", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  function openEdit(m: Memory) {
    setEditing(m);
    setEditTitle(m.title);
    setEditContent(m.content);
  }

  async function handleSave() {
    if (!editing) return;
    if (!editTitle.trim() || !editContent.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/memory/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, content: editContent }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const updated = await res.json();
      setMemories((cur) => cur.map((m) => (m.id === updated.id ? updated : m)));
      setEditing(null);
      toast({ title: "已儲存" });
    } catch (e) {
      console.error(e);
      toast({ title: "儲存失敗", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/memory/${confirmDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      setMemories((cur) => cur.filter((m) => m.id !== confirmDelete.id));
      setConfirmDelete(null);
      toast({ title: "已刪除" });
    } catch (e) {
      console.error(e);
      toast({ title: "刪除失敗", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (memories.length === 0) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Heart className="h-6 w-6" /> 我的記憶
        </h1>
        <div className="text-center py-16 text-muted-foreground border rounded-lg">
          <p className="text-lg mb-2">還沒有任何記憶</p>
          <p className="text-sm">
            對話中說「記住」「以後都」「我喜歡」這類關鍵字，AI 會幫你記下偏好或規則
          </p>
        </div>
      </div>
    );
  }

  const grouped = TYPE_ORDER.map((type) => ({
    type,
    items: memories.filter((m) => m.type === type),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Heart className="h-6 w-6" /> 我的記憶
        <span className="text-sm font-normal text-muted-foreground">
          ({memories.length})
        </span>
      </h1>

      <div className="space-y-6">
        {grouped.map(({ type, items }) => (
          <section key={type}>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase mb-3">
              {TYPE_LABEL[type]} · {items.length}
            </h2>
            <div className="space-y-2">
              {items.map((m) => (
                <Card key={m.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium line-clamp-1">{m.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                          {m.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {m.source === "EXPLICIT" ? "你說過要記住" : "AI 建議後你確認"}
                          {" · "}
                          {new Date(m.createdAt).toLocaleDateString("zh-TW")}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(m)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setConfirmDelete(m)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>編輯記憶</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">標題</label>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={120}
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
              />
            </div>
            <div>
              <label className="text-sm font-medium">內容</label>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={4}
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "儲存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確定要刪除這條記憶？</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            「{confirmDelete?.title}」刪除後無法恢復，下次對話也不再使用此記憶。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={deleting}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "刪除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
