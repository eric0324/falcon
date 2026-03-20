"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Wand2, Search, Zap, X } from "lucide-react";

interface SkillItem {
  id: string;
  userId: string;
  name: string;
  description: string;
  prompt: string;
  requiredDataSources: string[];
  category: string;
  visibility: string;
  usageCount: number;
  user: { name: string | null };
}

export interface SelectedSkill {
  id: string;
  name: string;
  prompt: string;
  requiredDataSources: string[];
}

interface SkillSelectorProps {
  value: SelectedSkill | null;
  onSelect: (skill: SelectedSkill | null) => void;
  disabled?: boolean;
}

const CATEGORY_ORDER = ["analytics", "marketing", "project-management", "writing", "other"];

export function SkillSelector({ value, onSelect, disabled }: SkillSelectorProps) {
  const t = useTranslations("skills");
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch("/api/skills").then((r) => r.ok ? r.json() : []),
      fetch("/api/me").then((r) => r.ok ? r.json() : null),
    ]).then(([skillsData, userData]) => {
      setSkills(skillsData);
      if (userData?.session?.id) setCurrentUserId(userData.session.id);
    });
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return skills;
    const q = search.toLowerCase();
    return skills.filter(
      (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
    );
  }, [skills, search]);

  const mySkills = useMemo(() => filtered.filter((s) => s.userId === currentUserId), [filtered, currentUserId]);
  const publicSkills = useMemo(() => filtered.filter((s) => s.userId !== currentUserId), [filtered, currentUserId]);

  const groupByCategory = (items: SkillItem[]) => {
    const groups: Record<string, SkillItem[]> = {};
    for (const item of items) {
      const cat = item.category || "other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return CATEGORY_ORDER.filter((c) => groups[c]).map((c) => ({ category: c, items: groups[c] }));
  };

  const handleSelect = (skill: SkillItem) => {
    // Toggle: if already selected, deselect
    if (value?.id === skill.id) {
      onSelect(null);
    } else {
      onSelect({ id: skill.id, name: skill.name, prompt: skill.prompt, requiredDataSources: skill.requiredDataSources });
      // Fire-and-forget usage tracking
      fetch(`/api/skills/${skill.id}/use`, { method: "POST" }).catch(() => {});
    }
    setOpen(false);
    setSearch("");
  };

  const renderSkillItem = (skill: SkillItem, showAuthor: boolean) => {
    const isActive = value?.id === skill.id;
    return (
      <DropdownMenuItem
        key={skill.id}
        className="flex flex-col items-start gap-0.5 py-2 cursor-pointer"
        onSelect={() => handleSelect(skill)}
      >
        <div className="flex items-center gap-2 w-full">
          <span className={`font-medium text-sm truncate ${isActive ? "text-primary" : ""}`}>{skill.name}</span>
          {isActive && <span className="text-[10px] text-primary ml-1">✓</span>}
          {showAuthor && skill.user?.name && (
            <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{skill.user.name}</span>
          )}
        </div>
        <div className="flex items-center gap-2 w-full">
          <span className="text-xs text-muted-foreground truncate">{skill.description}</span>
          {skill.usageCount > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground ml-auto shrink-0">
              <Zap className="h-2.5 w-2.5" />
              {skill.usageCount}
            </span>
          )}
        </div>
      </DropdownMenuItem>
    );
  };

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 gap-1.5 text-xs ${value ? "text-primary" : ""}`}
            disabled={disabled}
          >
            <Wand2 className="h-3.5 w-3.5" />
            {value ? value.name : "Skills"}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-80 max-h-96 overflow-y-auto">
          {/* Search */}
          <div className="px-2 py-1.5">
            <div className="flex items-center gap-2 px-2 py-1 rounded-md border border-input bg-transparent">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("search")}
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* My Skills */}
          {mySkills.length > 0 && (
            <>
              <DropdownMenuLabel className="text-xs">{t("mySkills")}</DropdownMenuLabel>
              {mySkills.map((s) => renderSkillItem(s, false))}
              {publicSkills.length > 0 && <DropdownMenuSeparator />}
            </>
          )}

          {/* Public Skills */}
          {publicSkills.length > 0 && (
            <>
              <DropdownMenuLabel className="text-xs">{t("publicSkills")}</DropdownMenuLabel>
              {groupByCategory(publicSkills).map(({ category, items }) => (
                <div key={category}>
                  <div className="px-2 py-1">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase">
                      {t(`categories.${category}`)}
                    </span>
                  </div>
                  {items.map((s) => renderSkillItem(s, true))}
                </div>
              ))}
            </>
          )}

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              {t("empty")}
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear button when skill is active */}
      {value && (
        <button
          onClick={() => onSelect(null)}
          className="h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          disabled={disabled}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
