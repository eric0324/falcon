"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";

interface Role {
  id: string;
  name: string;
  createdAt: string;
  userCount: number;
}

export function RoleManager({ initialRoles }: { initialRoles: Role[] }) {
  const [roles, setRoles] = useState(initialRoles);
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
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error);
        return;
      }

      const role = await res.json();
      setRoles((prev) => [...prev, { ...role, userCount: 0 }].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
    } finally {
      setAdding(false);
    }
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return;
    setError(null);

    const res = await fetch(`/api/admin/roles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      return;
    }

    setRoles((prev) =>
      prev
        .map((r) => (r.id === id ? { ...r, name: editName.trim() } : r))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    setEditingId(null);
  }

  async function handleDelete(role: Role) {
    if (!confirm(`確定要刪除「${role.name}」角色嗎？將解除所有使用者和資料表的關聯。`)) return;

    const res = await fetch(`/api/admin/roles/${role.id}`, { method: "DELETE" });
    if (res.ok) {
      setRoles((prev) => prev.filter((r) => r.id !== role.id));
    }
  }

  return (
    <div className="max-w-lg">
      {/* Add new role */}
      <div className="flex gap-2 mb-6">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="輸入新角色名稱..."
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

      {/* Role list */}
      {roles.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          尚未建立任何角色
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {roles.map((role) => (
            <div key={role.id} className="flex items-center gap-3 p-3">
              {editingId === role.id ? (
                <>
                  <Input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(role.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="h-8"
                  />
                  <button onClick={() => handleRename(role.id)} className="p-1 rounded hover:bg-muted text-green-600">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-1 rounded hover:bg-muted text-muted-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="font-medium flex-1">{role.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {role.userCount} 位使用者
                  </span>
                  <button
                    onClick={() => { setEditingId(role.id); setEditName(role.name); setError(null); }}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(role)}
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
