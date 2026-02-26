"use client";

import { useRouter } from "next/navigation";

interface LogFiltersProps {
  users: { id: string; name: string | null; email: string }[];
  dataSources: string[];
  current: {
    user?: string;
    source?: string;
    ds?: string;
    status?: string;
  };
}

export function LogFilters({ users, dataSources, current }: LogFiltersProps) {
  const router = useRouter();

  function update(key: string, value: string) {
    const params = new URLSearchParams();
    const entries = { ...current, [key]: value };
    for (const [k, v] of Object.entries(entries)) {
      if (v) params.set(k, v);
    }
    // reset to page 1 on filter change
    const qs = params.toString();
    router.push(`/admin/logs${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <select
        className="border rounded-md px-3 py-1.5 text-sm bg-white"
        value={current.user ?? ""}
        onChange={(e) => update("user", e.target.value)}
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
        value={current.source ?? ""}
        onChange={(e) => update("source", e.target.value)}
      >
        <option value="">所有來源</option>
        <option value="chat">chat</option>
        <option value="bridge">bridge</option>
      </select>

      <select
        className="border rounded-md px-3 py-1.5 text-sm bg-white"
        value={current.ds ?? ""}
        onChange={(e) => update("ds", e.target.value)}
      >
        <option value="">所有資料來源</option>
        {dataSources.map((ds) => (
          <option key={ds} value={ds}>
            {ds}
          </option>
        ))}
      </select>

      <select
        className="border rounded-md px-3 py-1.5 text-sm bg-white"
        value={current.status ?? ""}
        onChange={(e) => update("status", e.target.value)}
      >
        <option value="">所有狀態</option>
        <option value="success">成功</option>
        <option value="error">失敗</option>
      </select>
    </div>
  );
}
