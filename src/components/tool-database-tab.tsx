"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Database, ChevronDown, ChevronRight, Loader2 } from "lucide-react";

interface ColumnDef {
  name: string;
  type: string;
  options?: string[];
}

interface TableInfo {
  id: string;
  name: string;
  columns: ColumnDef[];
  rowCount: number;
}

interface RowsResponse {
  rows: Array<{ id: string; data: Record<string, unknown>; createdAt: string }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function ToolDatabaseSection({ toolId }: { toolId: string }) {
  const t = useTranslations("toolDatabase");
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/tools/${toolId}/tables`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => setTables(data.tables))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [toolId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (error || tables.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Database className="h-5 w-5" />
        {t("title")}
      </h2>
      <div className="space-y-3">
        {tables.map((table) => (
          <TableCard key={table.id} table={table} toolId={toolId} />
        ))}
      </div>
    </div>
  );
}

function TableCard({ table, toolId }: { table: TableInfo; toolId: string }) {
  const t = useTranslations("toolDatabase");
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <span className="font-medium">{table.name}</span>
          <span className="text-sm text-muted-foreground">({table.rowCount.toLocaleString()} {t("rows")})</span>
        </div>
      </button>
      {expanded && (
        <div className="border-t px-4 py-3 space-y-4">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">{t("columns")}</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1.5 pr-4 font-medium">{t("columnName")}</th>
                  <th className="text-left py-1.5 pr-4 font-medium">{t("columnType")}</th>
                  <th className="text-left py-1.5 font-medium">{t("columnOptions")}</th>
                </tr>
              </thead>
              <tbody>
                {table.columns.map((col) => (
                  <tr key={col.name} className="border-b last:border-0">
                    <td className="py-1.5 pr-4">{col.name}</td>
                    <td className="py-1.5 pr-4"><span className="text-xs bg-muted px-1.5 py-0.5 rounded">{col.type}</span></td>
                    <td className="py-1.5 text-muted-foreground">{col.options?.join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {table.rowCount > 0 && <DataPreview tableId={table.id} toolId={toolId} columns={table.columns} />}
        </div>
      )}
    </div>
  );
}

function DataPreview({ tableId, toolId, columns }: { tableId: string; toolId: string; columns: ColumnDef[] }) {
  const t = useTranslations("toolDatabase");
  const [data, setData] = useState<RowsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback((p: number) => {
    setLoading(true);
    fetch(`/api/tools/${toolId}/tables/${tableId}/rows?page=${p}`)
      .then((res) => res.json())
      .then((d) => { setData(d); setPage(p); })
      .finally(() => setLoading(false));
  }, [toolId, tableId]);

  useEffect(() => { fetchData(1); }, [fetchData]);

  if (loading && !data) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground py-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /></div>;
  }
  if (!data || data.rows.length === 0) return null;

  return (
    <div>
      <h4 className="text-sm font-medium text-muted-foreground mb-2">{t("preview")}</h4>
      <div className="overflow-x-auto border rounded">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              {columns.map((col) => (
                <th key={col.name} className="text-left py-2 px-3 font-medium whitespace-nowrap">{col.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.id} className="border-t">
                {columns.map((col) => (
                  <td key={col.name} className="py-1.5 px-3 whitespace-nowrap max-w-[200px] truncate">
                    {row.data[col.name] == null ? "—" : typeof row.data[col.name] === "boolean" ? (row.data[col.name] ? "✓" : "✗") : String(row.data[col.name])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
          <span>{(page - 1) * data.pageSize + 1}-{Math.min(page * data.pageSize, data.total)} / {data.total}</span>
          <div className="flex gap-1">
            <button onClick={() => fetchData(page - 1)} disabled={page <= 1 || loading} className="px-2 py-1 rounded hover:bg-muted disabled:opacity-50">‹</button>
            <button onClick={() => fetchData(page + 1)} disabled={page >= data.totalPages || loading} className="px-2 py-1 rounded hover:bg-muted disabled:opacity-50">›</button>
          </div>
        </div>
      )}
    </div>
  );
}
