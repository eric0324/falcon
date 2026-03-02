"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScanFinding {
  severity: string;
  category: string;
  rule: string;
  message: string;
  line?: number;
  snippet?: string;
}

interface Scan {
  id: string;
  toolId: string;
  toolName: string;
  authorName: string;
  status: "PASS" | "WARN" | "FAIL";
  findings: ScanFinding[];
  llmSummary: string | null;
  scannedAt: string;
}

const statusConfig = {
  FAIL: { label: "FAIL", className: "bg-red-100 text-red-800" },
  WARN: { label: "WARN", className: "bg-yellow-100 text-yellow-800" },
  PASS: { label: "PASS", className: "bg-green-100 text-green-800" },
};

const severityColor: Record<string, string> = {
  critical: "text-red-600",
  warning: "text-yellow-600",
  info: "text-blue-600",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function ScanList({
  scans,
  currentStatus,
}: {
  scans: Scan[];
  currentStatus?: string;
}) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rescanning, setRescanning] = useState<string | null>(null);
  const [rescanError, setRescanError] = useState<string | null>(null);

  const filters = [
    { label: "全部", value: undefined },
    { label: "FAIL", value: "FAIL" },
    { label: "WARN", value: "WARN" },
    { label: "PASS", value: "PASS" },
  ];

  const handleFilter = (value?: string) => {
    const params = new URLSearchParams();
    if (value) params.set("status", value);
    router.push(`/admin/scans${params.toString() ? `?${params}` : ""}`);
  };

  const handleRescan = async (toolId: string) => {
    setRescanning(toolId);
    try {
      const res = await fetch(`/api/admin/tools/${toolId}/scan`, { method: "POST" });
      if (!res.ok) throw new Error("Scan failed");
      router.refresh();
    } catch {
      setRescanError(toolId);
      setTimeout(() => setRescanError(null), 3000);
    } finally {
      setRescanning(null);
    }
  };

  return (
    <>
      {/* Filter buttons */}
      <div className="flex gap-2 mb-4">
        {filters.map((f) => (
          <Button
            key={f.label}
            variant={currentStatus === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-8 p-3" />
              <th className="text-left p-3 font-medium">工具名稱</th>
              <th className="text-left p-3 font-medium">作者</th>
              <th className="text-left p-3 font-medium">狀態</th>
              <th className="text-right p-3 font-medium">Findings</th>
              <th className="text-left p-3 font-medium">掃描時間</th>
              <th className="text-right p-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {scans.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  沒有掃描紀錄
                </td>
              </tr>
            ) : (
              scans.map((scan) => {
                const isExpanded = expandedId === scan.id;
                const cfg = statusConfig[scan.status];

                return (
                  <tr key={scan.id} className="border-b last:border-b-0">
                    <td colSpan={7} className="p-0">
                      {/* Main row */}
                      <div
                        className="flex items-center cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => setExpandedId(isExpanded ? null : scan.id)}
                      >
                        <div className="w-8 p-3 flex justify-center">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 p-3 text-sm">{scan.toolName}</div>
                        <div className="flex-1 p-3 text-sm text-muted-foreground">{scan.authorName}</div>
                        <div className="flex-1 p-3">
                          <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", cfg.className)}>
                            {cfg.label}
                          </span>
                        </div>
                        <div className="w-24 p-3 text-right text-sm">{scan.findings.length}</div>
                        <div className="flex-1 p-3 text-sm text-muted-foreground">
                          {formatDate(scan.scannedAt)}
                        </div>
                        <div className="w-24 p-3 text-right">
                          {rescanError === scan.toolId && (
                            <span className="text-xs text-red-500 mr-1">失敗</span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={rescanning === scan.toolId}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRescan(scan.toolId);
                            }}
                          >
                            <RefreshCw
                              className={cn(
                                "h-4 w-4",
                                rescanning === scan.toolId && "animate-spin"
                              )}
                            />
                          </Button>
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="px-11 pb-4 space-y-3 bg-muted/10">
                          {scan.llmSummary && (
                            <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                              <span className="font-medium">AI 摘要：</span> {scan.llmSummary}
                            </div>
                          )}
                          {scan.findings.length === 0 ? (
                            <p className="text-sm text-muted-foreground">沒有發現問題</p>
                          ) : (
                            <div className="space-y-2">
                              {scan.findings.map((f, i) => (
                                <div
                                  key={i}
                                  className="flex items-start gap-3 text-sm border-l-2 pl-3"
                                  style={{
                                    borderColor:
                                      f.severity === "critical"
                                        ? "#dc2626"
                                        : f.severity === "warning"
                                          ? "#ca8a04"
                                          : "#2563eb",
                                  }}
                                >
                                  <span className={cn("font-medium uppercase text-xs", severityColor[f.severity])}>
                                    {f.severity}
                                  </span>
                                  <div className="flex-1">
                                    <p>{f.message}</p>
                                    {f.line && (
                                      <p className="text-muted-foreground text-xs mt-0.5">
                                        Line {f.line}
                                        {f.snippet && `: ${f.snippet}`}
                                      </p>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground">{f.rule}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
