"use client";

import { useState } from "react";

interface Role {
  id: string;
  name: string;
}

interface Props {
  userId: string;
  allRoles: Role[];
  assignedRoleIds: string[];
}

export function UserRoleAssignment({ userId, allRoles, assignedRoleIds }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(assignedRoleIds));
  const [saving, setSaving] = useState(false);

  async function toggle(roleId: string) {
    const next = new Set(selected);
    if (next.has(roleId)) next.delete(roleId);
    else next.add(roleId);

    setSelected(next);
    setSaving(true);

    try {
      await fetch(`/api/admin/members/${userId}/roles`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleIds: Array.from(next) }),
      });
    } finally {
      setSaving(false);
    }
  }

  if (allRoles.length === 0) {
    return (
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">公司角色</h2>
        <p className="text-sm text-muted-foreground">
          尚未建立任何角色，請先到「角色管理」新增
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-2">
        公司角色
        {saving && <span className="text-xs text-muted-foreground font-normal ml-2">儲存中...</span>}
      </h2>
      <div className="flex flex-wrap gap-2">
        {allRoles.map((role) => {
          const isSelected = selected.has(role.id);
          return (
            <button
              key={role.id}
              onClick={() => toggle(role.id)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                isSelected
                  ? "bg-neutral-900 text-white border-neutral-900"
                  : "bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400"
              }`}
            >
              {role.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
