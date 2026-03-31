"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2, Copy, Check, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export function ApiKeysClient() {
  const t = useTranslations("apiKeys");
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/me/api-keys")
      .then((res) => res.json())
      .then(setKeys)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!createName.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/me/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewKey(data.key);
        setCreateName("");
        // Refresh list
        const updated = await fetch("/api/me/api-keys").then((r) => r.json());
        setKeys(updated);
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("deleteConfirm"))) return;
    const res = await fetch(`/api/me/api-keys/${id}`, { method: "DELETE" });
    if (res.ok) {
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast({ title: t("deleted") });
    }
  }

  function handleCopy() {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleCloseNewKey() {
    setNewKey(null);
    setShowCreate(false);
    setCopied(false);
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-32 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" />{t("create")}
        </Button>
      </div>

      {keys.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Key className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("activeKeys")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {keys.map((key) => (
                <div key={key.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{key.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{key.keyPrefix}••••••••</p>
                    <p className="text-xs text-muted-foreground">
                      {t("created")}: {new Date(key.createdAt).toLocaleDateString("zh-TW")}
                      {key.lastUsedAt && ` · ${t("lastUsed")}: ${new Date(key.lastUsedAt).toLocaleDateString("zh-TW")}`}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(key.id)} className="text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate && !newKey} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createTitle")}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium">{t("nameLabel")}</label>
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder={t("namePlaceholder")}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>{t("cancel")}</Button>
            <Button onClick={handleCreate} disabled={!createName.trim() || creating}>
              {creating ? t("creating") : t("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Key Display Dialog */}
      <Dialog open={!!newKey} onOpenChange={handleCloseNewKey}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("keyCreated")}</DialogTitle>
            <DialogDescription>{t("keyCreatedWarning")}</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md font-mono text-sm break-all">
              <span className="flex-1">{newKey}</span>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCloseNewKey}>{t("done")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
