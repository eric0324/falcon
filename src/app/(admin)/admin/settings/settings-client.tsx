"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Eye, EyeOff, Loader2 } from "lucide-react";

interface ConfigItem {
  key: string;
  description: string;
  sensitive: boolean;
  hasValue: boolean;
  value: string | null;
}

type ConfigGroups = Record<string, ConfigItem[]>;

const GROUP_LABELS: Record<string, string> = {
  google_oauth: "Google OAuth",
  anthropic: "Anthropic",
  openai: "OpenAI",
  google_ai: "Google AI",
  voyage: "Voyage AI",
  notion: "Notion",
  slack: "Slack",
  asana: "Asana",
  github: "GitHub",
  vimeo: "Vimeo",
  plausible: "Plausible Analytics",
  ga4: "Google Analytics 4",
  meta_ads: "Meta Ads",
  general: "一般設定",
};

export function SettingsClient() {
  const [groups, setGroups] = useState<ConfigGroups>({});
  const [loading, setLoading] = useState(true);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [savingGroup, setSavingGroup] = useState<string | null>(null);
  const [savedGroup, setSavedGroup] = useState<string | null>(null);
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});

  const fetchSettings = useCallback(async () => {
    const res = await fetch("/api/admin/settings");
    if (res.ok) setGroups(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  function hasGroupChanges(items: ConfigItem[]) {
    return items.some((item) => editValues[item.key] !== undefined);
  }

  async function handleSaveGroup(group: string, items: ConfigItem[]) {
    const changed = items.filter((item) => editValues[item.key] !== undefined);
    if (changed.length === 0) return;

    setSavingGroup(group);
    for (const item of changed) {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: item.key, value: editValues[item.key] || null }),
      });
    }

    setSavingGroup(null);
    setSavedGroup(group);
    setTimeout(() => setSavedGroup(null), 2000);

    // Clear edited values for this group
    setEditValues((p) => {
      const next = { ...p };
      for (const item of changed) delete next[item.key];
      return next;
    });
    await fetchSettings();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">系統設定</h1>
        <p className="text-sm text-neutral-500 mt-1">
          敏感資料會加密儲存。
        </p>
      </div>

      {Object.entries(groups).map(([group, items]) => (
        <section key={group} className="border rounded-lg bg-white overflow-hidden">
          <div className="px-5 py-3 bg-neutral-50 border-b">
            <h2 className="text-sm font-semibold text-neutral-700">
              {GROUP_LABELS[group] || group}
            </h2>
          </div>

          <div className="divide-y">
            {items.map((item) => {
              const isEditing = editValues[item.key] !== undefined;
              const currentValue = isEditing ? editValues[item.key] : "";
              const isSensitive = item.sensitive;
              const isVisible = showValues[item.key];

              return (
                <div key={item.key} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-800">
                        {item.description}
                      </span>
                      {item.hasValue ? (
                        <span className="text-[11px] px-1.5 py-px rounded bg-green-50 text-green-600">
                          已設定
                        </span>
                      ) : (
                        <span className="text-[11px] px-1.5 py-px rounded bg-neutral-100 text-neutral-400">
                          未設定
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <Input
                      type={isSensitive && !isVisible ? "password" : "text"}
                      placeholder={
                        item.hasValue
                          ? isSensitive
                            ? "輸入新值覆蓋"
                            : item.value || ""
                          : item.key
                      }
                      value={currentValue}
                      onChange={(e) =>
                        setEditValues((p) => ({ ...p, [item.key]: e.target.value }))
                      }
                      className="text-sm h-9 pr-8 font-mono"
                    />
                    {isSensitive && (
                      <button
                        type="button"
                        onClick={() =>
                          setShowValues((p) => ({ ...p, [item.key]: !p[item.key] }))
                        }
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                      >
                        {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>

                  {!isSensitive && item.hasValue && item.value && !isEditing && (
                    <p className="mt-1 text-[11px] text-neutral-400 font-mono truncate">
                      {item.value}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="px-5 py-3 bg-neutral-50 border-t flex justify-end">
            <Button
              size="sm"
              disabled={!hasGroupChanges(items) || savingGroup === group}
              onClick={() => handleSaveGroup(group, items)}
              className="h-8 px-4 text-sm"
            >
              {savingGroup === group ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : savedGroup === group ? (
                <Check className="h-3.5 w-3.5 mr-1.5" />
              ) : null}
              {savedGroup === group ? "已儲存" : "儲存"}
            </Button>
          </div>
        </section>
      ))}
    </div>
  );
}
