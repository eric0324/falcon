"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  ArrowLeft,
  Settings,
  FileText,
  Users,
  Star,
  Upload,
  Plus,
  Check,
  X,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Search,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

interface KnowledgeBaseDetail {
  id: string;
  name: string;
  description: string | null;
  systemPrompt: string | null;
  createdBy: string;
  creator: { id: string; name: string | null; image: string | null };
  members: {
    id: string;
    role: string;
    user: { id: string; name: string | null; email: string; image: string | null };
  }[];
  _count: { points: number; uploads: number };
  reviews: {
    id: string;
    rating: number;
    content: string | null;
    user: { id: string; name: string | null; image: string | null };
    createdAt: string;
  }[];
  userRole: string;
  averageRating: number;
  reviewCount: number;
}

interface KnowledgePoint {
  id: string;
  content: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  metadata: { source?: string; page?: number; sheet?: string; row?: number } | null;
  upload: { fileName: string } | null;
  reviewer: { name: string | null } | null;
  createdAt: string;
}

interface PointsResponse {
  points: KnowledgePoint[];
  total: number;
  page: number;
  totalPages: number;
}

interface UploadRecord {
  id: string;
  fileName: string;
  fileType: string;
  status: "PROCESSING" | "PENDING_REVIEW" | "COMPLETED" | "FAILED";
  error: string | null;
  pointCount: number;
  createdAt: string;
  uploader: { id: string; name: string | null };
}

function StarRatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
          className="p-0.5"
        >
          <Star
            className={`h-6 w-6 transition-colors ${
              i <= (hover || value)
                ? "fill-amber-400 text-amber-400"
                : "text-neutral-300 dark:text-neutral-600"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export function KnowledgeDetailClient({ knowledgeBaseId }: { knowledgeBaseId: string }) {
  const router = useRouter();
  const t = useTranslations("knowledge");
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [kb, setKb] = useState<KnowledgeBaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadRecord[]>([]);

  // Points state
  const [pointsData, setPointsData] = useState<PointsResponse | null>(null);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialogs
  const [showReview, setShowReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewContent, setReviewContent] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showAddPoint, setShowAddPoint] = useState(false);
  const [newPointContent, setNewPointContent] = useState("");
  const [addingPoint, setAddingPoint] = useState(false);
  const [editingPoint, setEditingPoint] = useState<KnowledgePoint | null>(null);
  const [editContent, setEditContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showUploads, setShowUploads] = useState(false);

  // Notion import state
  const [showNotionImport, setShowNotionImport] = useState(false);
  const [notionQuery, setNotionQuery] = useState("");
  const [notionPages, setNotionPages] = useState<Array<{ id: string; title: string; url: string; lastEditedTime: string }>>([]);
  const [notionSearching, setNotionSearching] = useState(false);
  const [notionImporting, setNotionImporting] = useState<string | null>(null);

  const canContribute = kb?.userRole === "ADMIN" || kb?.userRole === "CONTRIBUTOR";

  const STATUS_KEYS: Record<string, string> = {
    PENDING: "statusPending",
    APPROVED: "statusApproved",
    REJECTED: "statusRejected",
  };

  const STATUS_COLORS: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  const UPLOAD_STATUS_KEYS: Record<string, string> = {
    PROCESSING: "uploadProcessing",
    PENDING_REVIEW: "uploadPendingReview",
    COMPLETED: "uploadCompleted",
    FAILED: "uploadFailed",
  };

  const UPLOAD_STATUS_COLORS: Record<string, string> = {
    PROCESSING: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    PENDING_REVIEW: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    FAILED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  const loadKb = useCallback(() => {
    fetch(`/api/knowledge-bases/${knowledgeBaseId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(setKb)
      .catch(() => setError(t("backToList")))
      .finally(() => setLoading(false));
  }, [knowledgeBaseId, t]);

  const loadPoints = useCallback(() => {
    setPointsLoading(true);
    const params = new URLSearchParams({ page: String(currentPage), limit: "20" });
    if (statusFilter !== "all") params.set("status", statusFilter);

    fetch(`/api/knowledge-bases/${knowledgeBaseId}/points?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setPointsData(data);
        setSelectedIds(new Set());
      })
      .catch(() => {})
      .finally(() => setPointsLoading(false));
  }, [knowledgeBaseId, currentPage, statusFilter]);

  const loadUploads = useCallback(() => {
    fetch(`/api/knowledge-bases/${knowledgeBaseId}/uploads`)
      .then((res) => res.json())
      .then(setUploads)
      .catch(() => {});
  }, [knowledgeBaseId]);

  useEffect(() => { loadKb(); }, [loadKb]);
  useEffect(() => { if (kb) { loadPoints(); loadUploads(); } }, [kb, loadPoints, loadUploads]);

  async function handleSubmitReview() {
    if (!reviewRating || submittingReview) return;
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/knowledge-bases/${knowledgeBaseId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: reviewRating, content: reviewContent.trim() || null }),
      });
      if (res.ok) {
        setShowReview(false);
        setReviewRating(0);
        setReviewContent("");
        loadKb();
      }
    } finally {
      setSubmittingReview(false);
    }
  }

  async function handleAddPoint() {
    if (!newPointContent.trim() || addingPoint) return;
    setAddingPoint(true);
    try {
      const res = await fetch(`/api/knowledge-bases/${knowledgeBaseId}/points`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newPointContent.trim() }),
      });
      if (res.ok) {
        setShowAddPoint(false);
        setNewPointContent("");
        loadPoints();
        loadKb();
      }
    } finally {
      setAddingPoint(false);
    }
  }

  async function handleEditPoint() {
    if (!editingPoint || !editContent.trim()) return;
    const res = await fetch(
      `/api/knowledge-bases/${knowledgeBaseId}/points/${editingPoint.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent.trim() }),
      }
    );
    if (res.ok) {
      setEditingPoint(null);
      setEditContent("");
      loadPoints();
    }
  }

  async function handleDeletePoint(pointId: string) {
    if (!confirm(t("deleteConfirm"))) return;
    const res = await fetch(
      `/api/knowledge-bases/${knowledgeBaseId}/points/${pointId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      loadPoints();
      loadKb();
    }
  }

  async function handleBatchReview(action: "approve" | "reject") {
    if (selectedIds.size === 0) return;
    const actionLabel = action === "approve" ? t("approve") : t("reject");
    if (!confirm(t("batchConfirm", { action: actionLabel, count: selectedIds.size }))) return;

    const res = await fetch(`/api/knowledge-bases/${knowledgeBaseId}/points/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pointIds: Array.from(selectedIds), action }),
    });
    if (res.ok) {
      loadPoints();
      loadKb();
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/knowledge-bases/${knowledgeBaseId}/uploads`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        toast({ title: t("uploadSuccess"), description: t("uploadSuccessDesc", { name: file.name }) });
        loadKb();
        loadUploads();
        const checkStatus = setInterval(async () => {
          const data = await fetch(`/api/knowledge-bases/${knowledgeBaseId}/uploads`).then((r) => r.json());
          setUploads(data);
          const latest = data[0];
          if (latest && latest.status !== "PROCESSING") {
            clearInterval(checkStatus);
            loadPoints();
            loadKb();
            if (latest.status === "PENDING_REVIEW") {
              toast({ title: t("parseComplete"), description: t("parseCompleteDesc", { count: latest.pointCount }) });
            } else if (latest.status === "FAILED") {
              toast({ title: t("parseFailed"), description: latest.error || "", variant: "destructive" });
            }
          }
        }, 2000);
        setTimeout(() => clearInterval(checkStatus), 60000);
      } else {
        const err = await res.json();
        toast({ title: t("uploadError"), description: err.error || "", variant: "destructive" });
      }
    } catch {
      toast({ title: t("uploadError"), description: t("networkError"), variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleNotionSearch() {
    if (notionSearching) return;
    setNotionSearching(true);
    try {
      const res = await fetch(
        `/api/knowledge-bases/${knowledgeBaseId}/import-notion?query=${encodeURIComponent(notionQuery)}`
      );
      if (res.ok) {
        const data = await res.json();
        setNotionPages(data.pages);
      }
    } finally {
      setNotionSearching(false);
    }
  }

  async function handleNotionImport(pageId: string, pageTitle: string) {
    setNotionImporting(pageId);
    try {
      const res = await fetch(`/api/knowledge-bases/${knowledgeBaseId}/import-notion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, pageTitle }),
      });
      if (res.ok) {
        const data = await res.json();
        toast({ title: t("parseComplete"), description: t("parseCompleteDesc", { count: data.pointCount }) });
        setShowNotionImport(false);
        setNotionQuery("");
        setNotionPages([]);
        loadPoints();
        loadKb();
        loadUploads();
      } else {
        const err = await res.json();
        toast({ title: t("uploadError"), description: err.error || "", variant: "destructive" });
      }
    } finally {
      setNotionImporting(null);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (!pointsData) return;
    if (selectedIds.size === pointsData.points.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pointsData.points.map((p) => p.id)));
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-32 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !kb) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/knowledge")}>
          {t("backToList")}
        </Button>
      </div>
    );
  }

  const isCreator = kb.createdBy === kb.creator.id;

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <header className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/knowledge"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold">{kb.name}</h1>
          {kb.description && <p className="text-sm text-muted-foreground">{kb.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {!isCreator && (
            <Button variant="outline" size="sm" onClick={() => setShowReview(true)}>
              <Star className="h-4 w-4 mr-1" />{t("rate")}
            </Button>
          )}
          {kb.userRole === "ADMIN" && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/knowledge/${kb.id}/settings`}>
                <Settings className="h-4 w-4 mr-1" />{t("settings.title")}
              </Link>
            </Button>
          )}
        </div>
      </header>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 mb-6">
        <Card><CardContent className="p-4 text-center">
          <FileText className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
          <div className="text-2xl font-bold">{kb._count.points}</div>
          <div className="text-xs text-muted-foreground">{t("points")}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Upload className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
          <div className="text-2xl font-bold">{kb._count.uploads}</div>
          <div className="text-xs text-muted-foreground">{t("uploads")}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
          <div className="text-2xl font-bold">{kb.members.length}</div>
          <div className="text-xs text-muted-foreground">{t("members")}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Star className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
          <div className="text-2xl font-bold">{kb.averageRating > 0 ? kb.averageRating.toFixed(1) : "-"}</div>
          <div className="text-xs text-muted-foreground">{kb.reviewCount} {t("reviews")}</div>
        </CardContent></Card>
      </div>

      {/* Upload Records — collapsible */}
      {uploads.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="cursor-pointer select-none" onClick={() => setShowUploads((v) => !v)}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("uploadRecords")} ({uploads.length})</CardTitle>
              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${showUploads ? "rotate-90" : ""}`} />
            </div>
          </CardHeader>
          {showUploads && (
            <CardContent>
              <div className="space-y-2">
                {uploads.map((upload) => (
                  <div key={upload.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{upload.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {upload.uploader.name} · {upload.pointCount > 0 ? `${upload.pointCount} ${t("points")}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${UPLOAD_STATUS_COLORS[upload.status]}`}>
                        {upload.status === "PROCESSING" && "⏳ "}{t(UPLOAD_STATUS_KEYS[upload.status])}
                      </span>
                      {upload.error && <span className="text-xs text-red-500" title={upload.error}>!</span>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Knowledge Points */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t("points")}</CardTitle>
            {canContribute && (
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" accept=".pdf,.xlsx,.xls,.csv" className="hidden" onChange={handleUpload} />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <Upload className="h-4 w-4 mr-1" />{uploading ? t("uploading") : t("uploadFile")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowNotionImport(true)}>
                  <BookOpen className="h-4 w-4 mr-1" />Notion
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowAddPoint(true)}>
                  <Plus className="h-4 w-4 mr-1" />{t("addManual")}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Status filter tabs */}
          <div className="flex gap-1 mb-4 border-b">
            {["all", "PENDING", "APPROVED", "REJECTED"].map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setCurrentPage(1); }}
                className={`px-3 py-2 text-sm border-b-2 transition-colors ${
                  statusFilter === s
                    ? "border-primary text-primary font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "all" ? t("all") : t(STATUS_KEYS[s])}
              </button>
            ))}
          </div>

          {/* Batch actions */}
          {canContribute && selectedIds.size > 0 && (
            <div className="flex items-center gap-2 mb-3 p-2 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">{t("selected", { count: selectedIds.size })}</span>
              <Button size="sm" variant="outline" onClick={() => handleBatchReview("approve")}>
                <Check className="h-3.5 w-3.5 mr-1" />{t("approve")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBatchReview("reject")}>
                <X className="h-3.5 w-3.5 mr-1" />{t("reject")}
              </Button>
            </div>
          )}

          {/* Points list */}
          {pointsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted animate-pulse rounded" />)}
            </div>
          ) : !pointsData || pointsData.points.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t("noPoints")}</p>
          ) : (
            <>
              <div className="border rounded-lg divide-y">
                {canContribute && (
                  <div className="flex items-center gap-3 px-4 py-2 bg-muted/30">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === pointsData.points.length && pointsData.points.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                    <span className="text-xs text-muted-foreground">{t("selectAll")}</span>
                  </div>
                )}
                {pointsData.points.map((point) => (
                  <div key={point.id} className="flex items-start gap-3 px-4 py-3">
                    {canContribute && (
                      <input type="checkbox" checked={selectedIds.has(point.id)} onChange={() => toggleSelect(point.id)} className="rounded mt-1" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-clamp-3">{point.content}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_COLORS[point.status]}`}>
                          {t(STATUS_KEYS[point.status])}
                        </span>
                        {point.upload && <span className="text-xs text-muted-foreground">{point.upload.fileName}</span>}
                        {point.metadata && (point.metadata as Record<string, unknown>).page != null && (
                          <span className="text-xs text-muted-foreground">P.{String((point.metadata as Record<string, unknown>).page)}</span>
                        )}
                      </div>
                    </div>
                    {canContribute && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => { setEditingPoint(point); setEditContent(point.content); }} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDeletePoint(point.id)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {pointsData.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">{currentPage} / {pointsData.totalPages}</span>
                  <Button variant="outline" size="sm" disabled={currentPage >= pointsData.totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Reviews */}
      {kb.reviews.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t("reviews")}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {kb.reviews.map((review) => (
                <div key={review.id} className="border-b last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{review.user.name || "—"}</span>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} className={`h-3 w-3 ${i <= review.rating ? "fill-amber-400 text-amber-400" : "text-neutral-300"}`} />
                      ))}
                    </div>
                  </div>
                  {review.content && <p className="text-sm text-muted-foreground">{review.content}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Dialog */}
      <Dialog open={showReview} onOpenChange={setShowReview}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("rateTitle", { name: kb.name })}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-2 block">{t("rateLabel")}</label>
              <StarRatingInput value={reviewRating} onChange={setReviewRating} />
            </div>
            <div>
              <label className="text-sm font-medium">{t("rateComment")}</label>
              <textarea value={reviewContent} onChange={(e) => setReviewContent(e.target.value)} placeholder={t("rateCommentPlaceholder")} className="mt-1 w-full rounded-md border px-3 py-2 text-sm resize-none" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReview(false)}>{t("cancel")}</Button>
            <Button onClick={handleSubmitReview} disabled={!reviewRating || submittingReview}>{submittingReview ? t("rateSubmitting") : t("rateSubmit")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Point Dialog */}
      <Dialog open={showAddPoint} onOpenChange={setShowAddPoint}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("addManualTitle")}</DialogTitle></DialogHeader>
          <div className="py-2">
            <textarea value={newPointContent} onChange={(e) => setNewPointContent(e.target.value)} placeholder={t("addManualPlaceholder")} className="w-full rounded-md border px-3 py-2 text-sm resize-none" rows={6} autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPoint(false)}>{t("cancel")}</Button>
            <Button onClick={handleAddPoint} disabled={!newPointContent.trim() || addingPoint}>{addingPoint ? t("adding") : t("add")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Point Dialog */}
      <Dialog open={!!editingPoint} onOpenChange={() => setEditingPoint(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("editTitle")}</DialogTitle></DialogHeader>
          <div className="py-2">
            <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm resize-none" rows={6} autoFocus />
            {editingPoint?.status === "APPROVED" && (
              <p className="text-xs text-amber-600 mt-2">{t("editApprovedWarning")}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPoint(null)}>{t("cancel")}</Button>
            <Button onClick={handleEditPoint} disabled={!editContent.trim()}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notion Import Dialog */}
      <Dialog open={showNotionImport} onOpenChange={setShowNotionImport}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("notionImport")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <input
                value={notionQuery}
                onChange={(e) => setNotionQuery(e.target.value)}
                placeholder={t("notionSearchPlaceholder")}
                className="flex-1 rounded-md border px-3 py-2 text-sm"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleNotionSearch(); }}
              />
              <Button onClick={handleNotionSearch} disabled={notionSearching} size="sm">
                {notionSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            <div className="max-h-80 overflow-y-auto space-y-1">
              {notionPages.length === 0 && !notionSearching && (
                <p className="text-sm text-muted-foreground text-center py-6">{t("notionSearchHint")}</p>
              )}
              {notionPages.map((page) => (
                <div
                  key={page.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{page.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(page.lastEditedTime).toLocaleDateString("zh-TW")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={notionImporting === page.id}
                    onClick={() => handleNotionImport(page.id, page.title)}
                  >
                    {notionImporting === page.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      t("notionImportButton")
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
