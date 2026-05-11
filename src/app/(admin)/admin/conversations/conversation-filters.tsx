"use client";

import { useRouter } from "next/navigation";

interface ConversationFiltersProps {
  users: { id: string; name: string | null; email: string }[];
  models: string[];
  current: {
    q?: string;
    starred?: string;
    userId?: string;
    model?: string;
    deleted?: string;
  };
}

export function ConversationFilters({
  users,
  models,
  current,
}: ConversationFiltersProps) {
  const router = useRouter();

  function update(key: string, value: string) {
    const params = new URLSearchParams();
    const entries = { ...current, [key]: value };
    for (const [k, v] of Object.entries(entries)) {
      if (v) params.set(k, v);
    }
    const qs = params.toString();
    router.push(`/admin/conversations${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <select
        className="border rounded-md px-3 py-1.5 text-sm bg-white"
        value={current.starred ?? ""}
        onChange={(e) => update("starred", e.target.value)}
      >
        <option value="">全部星標狀態</option>
        <option value="true">只看星標</option>
        <option value="false">只看未星標</option>
      </select>

      <select
        className="border rounded-md px-3 py-1.5 text-sm bg-white"
        value={current.userId ?? ""}
        onChange={(e) => update("userId", e.target.value)}
      >
        <option value="">所有使用者</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name || u.email}
          </option>
        ))}
      </select>

      <select
        className="border rounded-md px-3 py-1.5 text-sm bg-white"
        value={current.model ?? ""}
        onChange={(e) => update("model", e.target.value)}
      >
        <option value="">所有模型</option>
        {models.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      <select
        className="border rounded-md px-3 py-1.5 text-sm bg-white"
        value={current.deleted ?? ""}
        onChange={(e) => update("deleted", e.target.value)}
      >
        <option value="">全部刪除狀態</option>
        <option value="hide">只看正常</option>
        <option value="only">只看已刪除</option>
      </select>
    </div>
  );
}
