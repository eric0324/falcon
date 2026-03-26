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
import { Checkbox } from "@/components/ui/checkbox";
import { TOOL_CATEGORIES } from "@/lib/categories";
import { X, AlertTriangle, Loader2 } from "lucide-react";

interface GroupOption {
  id: string;
  name: string;
}

interface DeployDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeploy: (data: {
    name: string;
    description: string;
    category: string;
    tags: string[];
    visibility: string;
    allowedGroupIds: string[];
  }) => void;
  defaultName?: string;
  defaultDescription?: string;
  defaultCategory?: string;
  defaultTags?: string[];
  defaultVisibility?: string;
  defaultAllowedGroupIds?: string[];
  isEditing?: boolean;
  hasAnyDataSource?: boolean;
  usesLLM?: boolean;
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
  defaultAllowedGroupIds = [],
  isEditing = false,
  hasAnyDataSource = false,
  usesLLM = false,
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
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(defaultAllowedGroupIds);
  const [isDeploying, setIsDeploying] = useState(false);

  // Fetch user's groups when visibility is GROUP
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(defaultName);
      setDescription(defaultDescription);
      setCategory(defaultCategory);
      setTags(defaultTags);
      setVisibility(defaultVisibility);
      setSelectedGroupIds(defaultAllowedGroupIds);
    }
  }, [open, defaultName, defaultDescription, defaultCategory, defaultTags, defaultVisibility, defaultAllowedGroupIds]);

  useEffect(() => {
    if (open && visibility === "GROUP" && groups.length === 0) {
      setGroupsLoading(true);
      fetch("/api/me/groups")
        .then((res) => res.json())
        .then((data) => setGroups(data))
        .catch(() => setGroups([]))
        .finally(() => setGroupsLoading(false));
    }
  }, [open, visibility, groups.length]);

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

  const handleGroupToggle = (groupId: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
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
        allowedGroupIds: visibility === "GROUP" ? selectedGroupIds : [],
      });
      onOpenChange(false);
    } finally {
      setIsDeploying(false);
    }
  };

  const isGroupButNoSelection = visibility === "GROUP" && selectedGroupIds.length === 0;

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
                <SelectItem value="GROUP">👥 {t("visibility.group")}</SelectItem>
                <SelectItem value="COMPANY">🏢 {t("visibility.company")}</SelectItem>
                <SelectItem value="PUBLIC">🌐 {t("visibility.public")}</SelectItem>
              </SelectContent>
            </Select>
            {hasAnyDataSource && visibility === "PUBLIC" && (
              <div className="flex gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>公開工具無法使用資料來源，請移除資料來源或調整為其他權限。</p>
              </div>
            )}
            {usesLLM && visibility === "PUBLIC" && (
              <div className="flex gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>此工具使用了 AI 文字處理功能，無法設為公開。請調整為其他權限。</p>
              </div>
            )}
          </div>

          {/* Group selector — only shown when visibility is GROUP */}
          {visibility === "GROUP" && (
            <div className="space-y-2">
              <Label>可見群組</Label>
              {groupsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  載入中...
                </div>
              ) : groups.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  你目前不屬於任何群組，請聯絡管理員。
                </p>
              ) : (
                <div className="space-y-2 rounded-md border p-3 max-h-40 overflow-y-auto">
                  {groups.map((group) => (
                    <label
                      key={group.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedGroupIds.includes(group.id)}
                        onCheckedChange={() => handleGroupToggle(group.id)}
                      />
                      <span className="text-sm">{group.name}</span>
                    </label>
                  ))}
                </div>
              )}
              {isGroupButNoSelection && (
                <p className="text-sm text-amber-600">請至少選擇一個群組。</p>
              )}
            </div>
          )}
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
            disabled={!name.trim() || isDeploying || (hasAnyDataSource && visibility === "PUBLIC") || (usesLLM && visibility === "PUBLIC") || isGroupButNoSelection}
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
