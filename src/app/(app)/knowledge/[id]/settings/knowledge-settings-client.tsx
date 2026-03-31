"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft, Trash2, Plus, X } from "lucide-react";
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

interface KnowledgeBaseDetail {
  id: string;
  name: string;
  description: string | null;
  systemPrompt: string | null;
  createdBy: string;
  members: {
    id: string;
    role: string;
    user: { id: string; name: string | null; email: string; image: string | null };
  }[];
  userRole: string;
}

export function KnowledgeSettingsClient({ knowledgeBaseId }: { knowledgeBaseId: string }) {
  const router = useRouter();
  const t = useTranslations("knowledge.settings");
  const tKb = useTranslations("knowledge");
  const { toast } = useToast();
  const [kb, setKb] = useState<KnowledgeBaseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [saving, setSaving] = useState(false);

  // Add member state
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("VIEWER");
  const [addingMember, setAddingMember] = useState(false);

  // Delete state
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadKb = useCallback(() => {
    fetch(`/api/knowledge-bases/${knowledgeBaseId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        setKb(data);
        setName(data.name);
        setDescription(data.description || "");
        setSystemPrompt(data.systemPrompt || "");
      })
      .catch(() => router.push("/knowledge"))
      .finally(() => setLoading(false));
  }, [knowledgeBaseId, router]);

  useEffect(() => { loadKb(); }, [loadKb]);

  async function handleSave() {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/knowledge-bases/${knowledgeBaseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          systemPrompt: systemPrompt.trim() || null,
        }),
      });
      if (res.ok) {
        toast({ title: t("saved") });
        loadKb();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleAddMember() {
    if (!memberEmail.trim() || addingMember) return;
    setAddingMember(true);
    try {
      const userRes = await fetch(`/api/admin/members?search=${encodeURIComponent(memberEmail.trim())}`);
      if (!userRes.ok) {
        toast({ title: t("memberNotFound"), variant: "destructive" });
        return;
      }
      const users = await userRes.json();
      const user = users.find((u: { email: string }) => u.email === memberEmail.trim());
      if (!user) {
        toast({ title: t("memberNotFound"), variant: "destructive" });
        return;
      }

      const res = await fetch(`/api/knowledge-bases/${knowledgeBaseId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, role: memberRole }),
      });
      if (res.ok) {
        toast({ title: t("memberAdded") });
        setShowAddMember(false);
        setMemberEmail("");
        setMemberRole("VIEWER");
        loadKb();
      }
    } finally {
      setAddingMember(false);
    }
  }

  async function handleUpdateRole(memberId: string, newRole: string) {
    const res = await fetch(`/api/knowledge-bases/${knowledgeBaseId}/members/${memberId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      toast({ title: t("memberUpdated") });
      loadKb();
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm(t("removeMemberConfirm"))) return;
    const res = await fetch(`/api/knowledge-bases/${knowledgeBaseId}/members/${memberId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast({ title: t("memberRemoved") });
      loadKb();
    }
  }

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/knowledge-bases/${knowledgeBaseId}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: t("deleted") });
        router.push("/knowledge");
      }
    } finally {
      setDeleting(false);
    }
  }

  if (loading || !kb) {
    return (
      <div className="p-4 sm:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-32 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (kb.userRole !== "ADMIN") {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-muted-foreground">{t("noPermission")}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href={`/knowledge/${knowledgeBaseId}`}>{t("back")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <header className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/knowledge/${knowledgeBaseId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
      </header>

      {/* Basic Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">{t("basicInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">{t("name")}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">{t("descriptionLabel")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm resize-none"
              rows={2}
              placeholder={t("descriptionPlaceholder")}
            />
          </div>
          <div>
            <label className="text-sm font-medium">{t("systemPrompt")}</label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-1">{t("systemPromptHelp")}</p>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm font-mono resize-none"
              rows={5}
              placeholder={t("systemPromptPlaceholder")}
            />
          </div>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? t("saving") : tKb("save")}
          </Button>
        </CardContent>
      </Card>

      {/* Members */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t("memberManagement")}</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowAddMember(true)}>
              <Plus className="h-4 w-4 mr-1" />{t("addMember")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Creator */}
            <div className="flex items-center justify-between py-2 border-b">
              <div>
                <span className="text-sm font-medium">{kb.members.find(m => m.user.id === kb.createdBy)?.user.name || t("creator")}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {kb.members.find(m => m.user.id === kb.createdBy)?.user.email}
                </span>
              </div>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{t("creator")}</span>
            </div>

            {/* Other members */}
            {kb.members
              .filter((m) => m.user.id !== kb.createdBy)
              .map((member) => (
                <div key={member.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <span className="text-sm font-medium">{member.user.name || "—"}</span>
                    <span className="text-xs text-muted-foreground ml-2">{member.user.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={member.role}
                      onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                      className="text-xs border rounded px-2 py-1"
                    >
                      <option value="ADMIN">{t("roleAdmin")}</option>
                      <option value="CONTRIBUTOR">{t("roleContributor")}</option>
                      <option value="VIEWER">{t("roleViewer")}</option>
                    </select>
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-red-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}

            {kb.members.filter((m) => m.user.id !== kb.createdBy).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">{t("noMembers")}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="text-base text-red-600">{t("dangerZone")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("deleteKb")}</p>
              <p className="text-xs text-muted-foreground">{t("deleteKbDesc")}</p>
            </div>
            <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}>
              <Trash2 className="h-4 w-4 mr-1" />
              {t("deleteKb")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add Member Dialog */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addMemberTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">{t("email")}</label>
              <input
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("role")}</label>
              <select
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="ADMIN">{t("roleAdminDesc")}</option>
                <option value="CONTRIBUTOR">{t("roleContributorDesc")}</option>
                <option value="VIEWER">{t("roleViewerDesc")}</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMember(false)}>{tKb("cancel")}</Button>
            <Button onClick={handleAddMember} disabled={!memberEmail.trim() || addingMember}>
              {addingMember ? tKb("adding") : tKb("add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteKbConfirm", { name: kb.name })}</DialogTitle>
            <DialogDescription>{t("deleteKbWarning")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>{tKb("cancel")}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? t("deleting") : t("deleteKb")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
