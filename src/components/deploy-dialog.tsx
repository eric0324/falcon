"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TOOL_CATEGORIES } from "@/lib/categories";
import { X } from "lucide-react";

interface DeployDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeploy: (data: {
    name: string;
    description: string;
    category: string;
    tags: string[];
    visibility: string;
  }) => void;
  defaultName?: string;
  defaultDescription?: string;
  defaultCategory?: string;
  defaultTags?: string[];
  defaultVisibility?: string;
  isEditing?: boolean;
}

export function DeployDialog({
  open,
  onOpenChange,
  onDeploy,
  defaultName = "",
  defaultDescription = "",
  defaultCategory = "",
  defaultTags = [],
  defaultVisibility = "PRIVATE",
  isEditing = false,
}: DeployDialogProps) {
  const t = useTranslations("deploy");
  const tCategories = useTranslations("categories");
  const tCommon = useTranslations("common");
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState(defaultDescription);
  const [category, setCategory] = useState(defaultCategory);
  const [tags, setTags] = useState<string[]>(defaultTags);
  const [tagInput, setTagInput] = useState("");
  const [visibility, setVisibility] = useState(defaultVisibility);
  const [isDeploying, setIsDeploying] = useState(false);

  useEffect(() => {
    if (open) {
      setName(defaultName);
      setDescription(defaultDescription);
      setCategory(defaultCategory);
      setTags(defaultTags);
      setVisibility(defaultVisibility);
    }
  }, [open, defaultName, defaultDescription, defaultCategory, defaultTags, defaultVisibility]);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!tags.includes(newTag) && tags.length < 5) {
        setTags([...tags, newTag]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleDeploy = async () => {
    if (!name.trim()) return;

    setIsDeploying(true);
    try {
      await onDeploy({
        name: name.trim(),
        description: description.trim(),
        category,
        tags,
        visibility,
      });
      onOpenChange(false);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? t("title.save") : t("title.deploy")}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? t("description.save")
              : t("description.deploy")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="name">{t("form.name")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("form.namePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t("form.description")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("form.descriptionPlaceholder")}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("form.category")}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder={t("form.categoryPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {TOOL_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.icon} {tCategories(cat.id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">{t("form.tags")}</Label>
            <Input
              id="tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder={t("form.tagsPlaceholder")}
              disabled={tags.length >= 5}
            />
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-sm bg-blue-50 text-blue-600 px-2 py-0.5 rounded"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-blue-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t("form.visibility")}</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRIVATE">🔒 {t("visibility.private")}</SelectItem>
                <SelectItem value="DEPARTMENT">👥 {t("visibility.department")}</SelectItem>
                <SelectItem value="COMPANY">🏢 {t("visibility.company")}</SelectItem>
                <SelectItem value="PUBLIC">🌐 {t("visibility.public")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeploying}
          >
            {tCommon("cancel")}
          </Button>
          <Button
            onClick={handleDeploy}
            disabled={!name.trim() || isDeploying}
          >
            {isDeploying
              ? isEditing
                ? tCommon("saving")
                : tCommon("deploying")
              : isEditing
              ? tCommon("save")
              : tCommon("deploy")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
