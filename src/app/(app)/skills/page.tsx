"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Pencil, Trash2, Loader2, Wand2, Eye, EyeOff, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const CATEGORIES = ["analytics", "marketing", "project-management", "writing", "other"] as const;

interface Skill {
  id: string;
  name: string;
  description: string;
  prompt: string;
  requiredDataSources: string[];
  category: string;
  visibility: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function SkillsPage() {
  const t = useTranslations("skills");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState<string>("other");
  const [visibility, setVisibility] = useState<string>("private");

  const fetchSkills = async () => {
    try {
      const res = await fetch("/api/skills/mine");
      if (res.ok) {
        const data = await res.json();
        setSkills(data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const resetForm = () => {
    setName("");
    setDescription("");
    setPrompt("");
    setCategory("other");
    setVisibility("private");
    setEditingSkill(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (skill: Skill) => {
    setEditingSkill(skill);
    setName(skill.name);
    setDescription(skill.description);
    setPrompt(skill.prompt);
    setCategory(skill.category);
    setVisibility(skill.visibility);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !description.trim() || !prompt.trim()) return;
    setSaving(true);

    try {
      const body = { name: name.trim(), description: description.trim(), prompt: prompt.trim(), category, visibility };

      if (editingSkill) {
        const res = await fetch(`/api/skills/${editingSkill.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const updated = await res.json();
          setSkills((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        }
      } else {
        const res = await fetch("/api/skills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const created = await res.json();
          setSkills((prev) => [created, ...prev]);
        }
      }

      setDialogOpen(false);
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirmId(null);
    const res = await fetch(`/api/skills/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSkills((prev) => prev.filter((s) => s.id !== id));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold">{t("title")}</h2>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t("create")}
        </Button>
      </div>

      {skills.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Wand2 className="h-5 w-5" />
              {t("empty")}
            </CardTitle>
            <CardDescription>{t("selectHint")}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              {t("create")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {skills.map((skill) => (
            <Card key={skill.id} className="group relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{skill.name}</CardTitle>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(skill)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:text-red-600" onClick={() => setDeleteConfirmId(skill.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="line-clamp-2">{skill.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="bg-muted px-2 py-0.5 rounded-full">{t(`categories.${skill.category}`)}</span>
                  <span className="flex items-center gap-1">
                    {skill.visibility === "public" ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    {t(skill.visibility)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {skill.usageCount}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); resetForm(); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSkill ? t("edit") : t("create")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} placeholder="e.g. 後端工程師" />
            </div>
            <div>
              <Label>{t("description")}</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} placeholder="簡短描述這個 Skill 的用途" />
            </div>
            <div>
              <Label>{t("prompt")}</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                maxLength={2000}
                rows={6}
                placeholder="輸入 AI 的行為指令，例如：你是一位資深後端工程師，擅長..."
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">{prompt.length}/2000</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("category")}</Label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{t(`categories.${c}`)}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>{t("visibility")}</Label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                >
                  <option value="private">{t("private")}</option>
                  <option value="public">{t("public")}</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving || !name.trim() || !description.trim() || !prompt.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingSkill ? "儲存" : "建立"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("delete")}</DialogTitle>
            <DialogDescription>{t("deleteConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>取消</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
