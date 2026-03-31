"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Star, Users, FileText, BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface KnowledgeBase {
  id: string;
  name: string;
  description: string | null;
  createdBy: string;
  creator: { id: string; name: string | null };
  _count: { points: number; members: number };
  averageRating: number;
  reviewCount: number;
  updatedAt: string;
}

function StarRating({ rating, count, label }: { rating: number; count: number; label: string }) {
  return (
    <div className="flex items-center gap-1 text-sm">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i <= Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "text-neutral-300 dark:text-neutral-600"
          }`}
        />
      ))}
      {count > 0 && (
        <span className="text-muted-foreground text-xs ml-1">
          {rating.toFixed(1)} ({count} {label})
        </span>
      )}
    </div>
  );
}

export function KnowledgePageClient() {
  const router = useRouter();
  const t = useTranslations("knowledge");
  const tCommon = useTranslations("common");
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/knowledge-bases")
      .then((res) => res.json())
      .then(setKnowledgeBases)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!createName.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/knowledge-bases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName.trim(),
          description: createDescription.trim() || null,
        }),
      });
      if (res.ok) {
        const kb = await res.json();
        setShowCreate(false);
        setCreateName("");
        setCreateDescription("");
        router.push(`/knowledge/${kb.id}`);
      }
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6 sm:mb-8 gap-4">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold">{t("title")}</h2>
          <p className="text-muted-foreground text-sm sm:text-base">{t("description")}</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">{t("create")}</span>
          <span className="sm:hidden">{t("createShort")}</span>
        </Button>
      </div>

      {knowledgeBases.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <CardTitle>{t("emptyTitle")}</CardTitle>
            <CardDescription>{t("emptyDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("create")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {knowledgeBases.map((kb) => (
            <Card
              key={kb.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/knowledge/${kb.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <BookMarked className="h-5 w-5 text-primary shrink-0" />
                    <CardTitle className="text-base truncate">{kb.name}</CardTitle>
                  </div>
                </div>
                {kb.description && (
                  <CardDescription className="line-clamp-2">{kb.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      {kb._count.points} {t("points")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {kb._count.members} {t("members")}
                    </span>
                  </div>
                  <StarRating rating={kb.averageRating} count={kb.reviewCount} label={t("reviews")} />
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {t("createdBy", { name: kb.creator.name || "Unknown" })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createDialog.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">{t("settings.name")}</label>
              <input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder={t("createDialog.namePlaceholder")}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("settings.descriptionLabel")}</label>
              <textarea
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder={t("createDialog.descriptionPlaceholder")}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>{tCommon("cancel")}</Button>
            <Button onClick={handleCreate} disabled={!createName.trim() || creating}>
              {creating ? t("createDialog.creating") : t("createDialog.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
