"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronDown, Key, RefreshCw, EyeOff, Eye, Shield } from "lucide-react";

interface RoleRef {
  id: string;
  name: string;
}

interface Column {
  id: string;
  columnName: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  note: string | null;
  allowedRoles: RoleRef[];
}

interface Table {
  id: string;
  tableName: string;
  note: string | null;
  hidden: boolean;
  allowedRoles: RoleRef[];
  columns: Column[];
}

interface SchemaBrowserProps {
  databaseId: string;
  tables: Table[];
  allRoles: RoleRef[];
}

// Role picker dropdown
function RolePicker({
  allRoles,
  selectedIds,
  onSave,
}: {
  allRoles: RoleRef[];
  selectedIds: string[];
  onSave: (roleIds: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function toggle(roleId: string) {
    const next = new Set(selected);
    if (next.has(roleId)) next.delete(roleId);
    else next.add(roleId);
    setSelected(next);
    onSave(Array.from(next));
  }

  if (allRoles.length === 0) return null;

  const selectedRoles = allRoles.filter((r) => selectedIds.includes(r.id));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); setSelected(new Set(selectedIds)); }}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        title="設定角色權限"
      >
        <Shield className="h-3 w-3" />
        {selectedRoles.length === allRoles.length
          ? "全部"
          : selectedRoles.length === 0
            ? "無"
            : selectedRoles.map((r) => r.name).join(", ")}
      </button>

      {open && (
        <div className="absolute z-20 top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-2 min-w-[140px]">
          <div className="flex gap-1 mb-1 px-1">
            <button
              onClick={() => { const all = new Set(allRoles.map((r) => r.id)); setSelected(all); onSave(Array.from(all)); }}
              className="text-xs text-blue-600 hover:underline"
            >
              全選
            </button>
            <span className="text-xs text-muted-foreground">/</span>
            <button
              onClick={() => { setSelected(new Set()); onSave([]); }}
              className="text-xs text-blue-600 hover:underline"
            >
              全取消
            </button>
          </div>
          {allRoles.map((role) => (
            <label
              key={role.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm"
            >
              <input
                type="checkbox"
                checked={selected.has(role.id)}
                onChange={() => toggle(role.id)}
                className="rounded border-neutral-300"
              />
              {role.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function SchemaBrowser({ databaseId, tables: initialTables, allRoles }: SchemaBrowserProps) {
  const [tables, setTables] = useState(initialTables);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const [editingNote, setEditingNote] = useState<{ type: "table" | "column"; id: string } | null>(null);
  const [noteValue, setNoteValue] = useState("");

  function toggleTable(tableId: string) {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableId)) next.delete(tableId);
      else next.add(tableId);
      return next;
    });
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch(`/api/admin/databases/${databaseId}/sync`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "掃描失敗");
        return;
      }
      const data = await res.json();
      setTables(data.tables);
    } finally {
      setSyncing(false);
    }
  }

  async function toggleHidden(table: Table) {
    const res = await fetch(`/api/admin/databases/${databaseId}/tables/${table.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden: !table.hidden }),
    });
    if (res.ok) {
      setTables((prev) => prev.map((t) => (t.id === table.id ? { ...t, hidden: !t.hidden } : t)));
    }
  }

  function startEditNote(type: "table" | "column", id: string, currentNote: string | null) {
    setEditingNote({ type, id });
    setNoteValue(currentNote || "");
  }

  async function saveNote() {
    if (!editingNote) return;
    const { type, id } = editingNote;

    if (type === "table") {
      const res = await fetch(`/api/admin/databases/${databaseId}/tables/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: noteValue }),
      });
      if (res.ok) {
        setTables((prev) => prev.map((t) => (t.id === id ? { ...t, note: noteValue || null } : t)));
      }
    } else {
      const table = tables.find((t) => t.columns.some((c) => c.id === id));
      if (!table) return;
      const res = await fetch(`/api/admin/databases/${databaseId}/tables/${table.id}/columns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: noteValue }),
      });
      if (res.ok) {
        setTables((prev) =>
          prev.map((t) => ({
            ...t,
            columns: t.columns.map((c) => (c.id === id ? { ...c, note: noteValue || null } : c)),
          }))
        );
      }
    }
    setEditingNote(null);
  }

  async function updateTableRoles(tableId: string, roleIds: string[]) {
    const res = await fetch(`/api/admin/databases/${databaseId}/tables/${tableId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allowedRoleIds: roleIds }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTables((prev) => prev.map((t) => (t.id === tableId ? { ...t, allowedRoles: updated.allowedRoles } : t)));
    }
  }

  async function updateColumnRoles(tableId: string, columnId: string, roleIds: string[]) {
    const res = await fetch(`/api/admin/databases/${databaseId}/tables/${tableId}/columns/${columnId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allowedRoleIds: roleIds }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTables((prev) =>
        prev.map((t) => ({
          ...t,
          columns: t.columns.map((c) => (c.id === columnId ? { ...c, allowedRoles: updated.allowedRoles } : c)),
        }))
      );
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          資料表
          <span className="text-muted-foreground font-normal ml-2">({tables.length})</span>
        </h2>
        <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing}>
          <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "掃描中..." : "重新掃描"}
        </Button>
      </div>

      {tables.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          尚未掃描，請點擊「重新掃描」取得資料表結構
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {tables.map((table) => {
            const isExpanded = expandedTables.has(table.id);
            return (
              <div key={table.id} className={table.hidden ? "opacity-50" : ""}>
                {/* Table row */}
                <div className="flex items-center gap-2 p-3 hover:bg-muted/30 transition-colors">
                  <button onClick={() => toggleTable(table.id)} className="p-0.5 rounded hover:bg-muted">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>

                  <span className="font-mono text-sm font-medium">{table.tableName}</span>
                  <span className="text-xs text-muted-foreground">({table.columns.length} 欄位)</span>

                  {/* Table note */}
                  {editingNote?.type === "table" && editingNote.id === table.id ? (
                    <input
                      autoFocus
                      value={noteValue}
                      onChange={(e) => setNoteValue(e.target.value)}
                      onBlur={saveNote}
                      onKeyDown={(e) => { if (e.key === "Enter") saveNote(); if (e.key === "Escape") setEditingNote(null); }}
                      className="flex-1 text-sm border rounded px-2 py-0.5 max-w-xs"
                      placeholder="輸入備註..."
                    />
                  ) : (
                    <button
                      onClick={() => startEditNote("table", table.id, table.note)}
                      className="text-xs text-muted-foreground hover:text-foreground truncate max-w-xs"
                    >
                      {table.note || "點擊加備註"}
                    </button>
                  )}

                  <div className="ml-auto flex items-center gap-2">
                    {/* Role picker for table */}
                    <RolePicker
                      allRoles={allRoles}
                      selectedIds={table.allowedRoles.map((r) => r.id)}
                      onSave={(ids) => updateTableRoles(table.id, ids)}
                    />
                    <button
                      onClick={() => toggleHidden(table)}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                      title={table.hidden ? "取消隱藏" : "隱藏此資料表"}
                    >
                      {table.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Columns */}
                {isExpanded && (
                  <div className="bg-muted/20 border-t">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="text-left p-2 pl-10 font-medium">欄位名稱</th>
                          <th className="text-left p-2 font-medium">備註</th>
                          <th className="text-left p-2 font-medium">角色</th>
                        </tr>
                      </thead>
                      <tbody>
                        {table.columns.map((col) => (
                          <tr key={col.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="p-2 pl-10 font-mono">
                              <span className="flex items-center gap-1">
                                {col.isPrimaryKey && <Key className="h-3 w-3 text-amber-500" />}
                                {col.columnName}
                              </span>
                            </td>
                            <td className="p-2">
                              {editingNote?.type === "column" && editingNote.id === col.id ? (
                                <input
                                  autoFocus
                                  value={noteValue}
                                  onChange={(e) => setNoteValue(e.target.value)}
                                  onBlur={saveNote}
                                  onKeyDown={(e) => { if (e.key === "Enter") saveNote(); if (e.key === "Escape") setEditingNote(null); }}
                                  className="w-full text-sm border rounded px-2 py-0.5"
                                  placeholder="輸入備註..."
                                />
                              ) : (
                                <button
                                  onClick={() => startEditNote("column", col.id, col.note)}
                                  className="text-xs text-muted-foreground hover:text-foreground"
                                >
                                  {col.note || "點擊加備註"}
                                </button>
                              )}
                            </td>
                            <td className="p-2">
                              <RolePicker
                                allRoles={allRoles}
                                selectedIds={col.allowedRoles.map((r) => r.id)}
                                onSave={(ids) => updateColumnRoles(table.id, col.id, ids)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
