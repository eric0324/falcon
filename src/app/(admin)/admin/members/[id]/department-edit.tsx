"use client";

import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";

interface Props {
  userId: string;
  initialDepartment: string | null;
}

export function DepartmentEdit({ userId, initialDepartment }: Props) {
  const [department, setDepartment] = useState(initialDepartment ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState("");

  function startEdit() {
    setDraft(department);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ department: draft }),
      });
      if (res.ok) {
        const data = await res.json();
        setDepartment(data.department ?? "");
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">部門</h2>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="輸入部門名稱"
            className="border rounded px-3 py-1.5 text-sm w-60"
            autoFocus
            disabled={saving}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") cancel();
            }}
          />
          <button
            onClick={save}
            disabled={saving}
            className="p-1.5 rounded hover:bg-muted transition-colors text-green-600"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={cancel}
            disabled={saving}
            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-2">部門</h2>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {department || "未設定"}
        </span>
        <button
          onClick={startEdit}
          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
