"use client";

import { useState, useEffect } from "react";
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
import { X, Database, Globe } from "lucide-react";

interface DataSource {
  name: string;
  displayName: string;
  type: string;
  description: string | null;
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
    allowedSources: string[];
  }) => void;
  defaultName?: string;
  defaultDescription?: string;
  defaultCategory?: string;
  defaultTags?: string[];
  defaultVisibility?: string;
  defaultAllowedSources?: string[];
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
  defaultAllowedSources = [],
  isEditing = false,
}: DeployDialogProps) {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState(defaultDescription);
  const [category, setCategory] = useState(defaultCategory);
  const [tags, setTags] = useState<string[]>(defaultTags);
  const [tagInput, setTagInput] = useState("");
  const [visibility, setVisibility] = useState(defaultVisibility);
  const [allowedSources, setAllowedSources] = useState<string[]>(defaultAllowedSources);
  const [availableSources, setAvailableSources] = useState<DataSource[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);

  useEffect(() => {
    if (open) {
      setName(defaultName);
      setDescription(defaultDescription);
      setCategory(defaultCategory);
      setTags(defaultTags);
      setVisibility(defaultVisibility);
      setAllowedSources(defaultAllowedSources);
      // Fetch available data sources
      fetch("/api/datasources")
        .then((res) => res.json())
        .then((data) => setAvailableSources(data))
        .catch(() => setAvailableSources([]));
    }
  }, [open, defaultName, defaultDescription, defaultCategory, defaultTags, defaultVisibility, defaultAllowedSources]);

  const toggleSource = (sourceName: string) => {
    setAllowedSources((prev) =>
      prev.includes(sourceName)
        ? prev.filter((s) => s !== sourceName)
        : [...prev, sourceName]
    );
  };

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
        allowedSources,
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
          <DialogTitle>{isEditing ? "Save Tool" : "Deploy Tool"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your tool's name and description."
              : "Give your tool a name and description so you can find it later."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="name">名稱</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：費用報銷工具"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">描述 (選填)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例如：用於提交和追蹤費用報銷"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>分類</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="選擇分類" />
              </SelectTrigger>
              <SelectContent>
                {TOOL_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">標籤 (最多 5 個，按 Enter 新增)</Label>
            <Input
              id="tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="輸入標籤..."
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
            <Label>可見範圍</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRIVATE">🔒 僅自己可見</SelectItem>
                <SelectItem value="DEPARTMENT">👥 部門可見</SelectItem>
                <SelectItem value="COMPANY">🏢 全公司可見</SelectItem>
                <SelectItem value="PUBLIC">🌐 公開</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {availableSources.length > 0 && (
            <div className="space-y-2">
              <Label>資料源權限 (選填)</Label>
              <p className="text-sm text-gray-500">
                選擇此工具可以存取的資料源。未選擇則無法使用內部 API。
              </p>
              <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                {availableSources.map((source) => (
                  <label
                    key={source.name}
                    className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    <Checkbox
                      checked={allowedSources.includes(source.name)}
                      onCheckedChange={() => toggleSource(source.name)}
                    />
                    <div className="flex items-center gap-2 flex-1">
                      {source.type === "REST_API" ? (
                        <Globe className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Database className="h-4 w-4 text-green-500" />
                      )}
                      <div>
                        <div className="font-medium text-sm">{source.displayName}</div>
                        {source.description && (
                          <div className="text-xs text-gray-500">{source.description}</div>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeploying}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeploy}
            disabled={!name.trim() || isDeploying}
          >
            {isDeploying
              ? isEditing
                ? "Saving..."
                : "Deploying..."
              : isEditing
              ? "Save"
              : "Deploy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
