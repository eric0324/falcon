"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";

interface Group {
  id: string;
  name: string;
  createdAt: string;
  userCount: number;
}

export function GroupManager({ initialGroups }: { initialGroups: Group[] }) {
  const [groups, setGroups] = useState(initialGroups);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error);
        return;
      }

      const group = await res.json();
      setGroups((prev) => [...prev, { ...group, userCount: 0 }].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
    } finally {
      setAdding(false);
    }
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return;
    setError(null);

    const res = await fetch(`/api/admin/groups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      return;
    }

    setGroups((prev) =>
      prev
        .map((r) => (r.id === id ? { ...r, name: editName.trim() } : r))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    setEditingId(null);
  }

  async function handleDelete(group: Group) {
    if (!confirm(`確定要刪除「${group.name}」群組嗎？將解除所有使用者和資料表的關聯。`)) return;

    const res = await fetch(`/api/admin/groups/${group.id}`, { method: "DELETE" });
    if (res.ok) {
      setGroups((prev) => prev.filter((r) => r.id !== group.id));
    }
  }

  return (
    <div className="max-w-lg">
      {/* Add new group */}
      <div className="flex gap-2 mb-6">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="輸入新群組名稱..."
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
        />
        <Button onClick={handleAdd} disabled={adding || !newName.trim()} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          新增
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded p-2 mb-4">{error}</p>
      )}

      {/* Group list */}
      {groups.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          尚未建立任何群組
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {groups.map((group) => (
            <div key={group.id} className="flex items-center gap-3 p-3">
              {editingId === group.id ? (
                <>
                  <Input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(group.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="h-8"
                  />
                  <button onClick={() => handleRename(group.id)} className="p-1 rounded hover:bg-muted text-green-600">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-1 rounded hover:bg-muted text-muted-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="font-medium flex-1">{group.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {group.userCount} 位使用者
                  </span>
                  <button
                    onClick={() => { setEditingId(group.id); setEditName(group.name); setError(null); }}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(group)}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
