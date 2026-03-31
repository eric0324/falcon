"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Settings,
  FileText,
  Users,
  Star,
  Upload,
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

function StarRatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
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
  const [kb, setKb] = useState<KnowledgeBaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Review state
  const [showReview, setShowReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewContent, setReviewContent] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetch(`/api/knowledge-bases/${knowledgeBaseId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(setKb)
      .catch(() => setError("找不到知識庫"))
      .finally(() => setLoading(false));
  }, [knowledgeBaseId]);

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
        // Reload data
        const updated = await fetch(`/api/knowledge-bases/${knowledgeBaseId}`).then((r) => r.json());
        setKb(updated);
        setReviewRating(0);
        setReviewContent("");
      }
    } finally {
      setSubmittingReview(false);
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
        <p className="text-muted-foreground">{error || "找不到知識庫"}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/knowledge")}>
          返回列表
        </Button>
      </div>
    );
  }

  const isAdmin = kb.userRole === "ADMIN";
  const isCreator = kb.createdBy === kb.creator.id;

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      {/* Header */}
      <header className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/knowledge">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold">{kb.name}</h1>
          {kb.description && (
            <p className="text-sm text-muted-foreground">{kb.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isCreator && (
            <Button variant="outline" size="sm" onClick={() => setShowReview(true)}>
              <Star className="h-4 w-4 mr-1" />
              評價
            </Button>
          )}
          {isAdmin && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/knowledge/${kb.id}/settings`}>
                <Settings className="h-4 w-4 mr-1" />
                設定
              </Link>
            </Button>
          )}
        </div>
      </header>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <div className="text-2xl font-bold">{kb._count.points}</div>
            <div className="text-xs text-muted-foreground">知識點</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Upload className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <div className="text-2xl font-bold">{kb._count.uploads}</div>
            <div className="text-xs text-muted-foreground">上傳次數</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <div className="text-2xl font-bold">{kb.members.length}</div>
            <div className="text-xs text-muted-foreground">成員</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Star className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <div className="text-2xl font-bold">{kb.averageRating > 0 ? kb.averageRating.toFixed(1) : "-"}</div>
            <div className="text-xs text-muted-foreground">{kb.reviewCount} 則評價</div>
          </CardContent>
        </Card>
      </div>

      {/* Knowledge Points placeholder */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">知識點</CardTitle>
        </CardHeader>
        <CardContent>
          {kb._count.points === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              尚未上傳任何文件。上傳功能將在下一個版本開放。
            </p>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              知識點管理介面將在下一個版本開放。
            </p>
          )}
        </CardContent>
      </Card>

      {/* Reviews */}
      {kb.reviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">評價</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {kb.reviews.map((review) => (
                <div key={review.id} className="border-b last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{review.user.name || "匿名"}</span>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${
                            i <= review.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-neutral-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.content && (
                    <p className="text-sm text-muted-foreground">{review.content}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Dialog */}
      <Dialog open={showReview} onOpenChange={setShowReview}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>評價「{kb.name}」</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-2 block">評分</label>
              <StarRatingInput value={reviewRating} onChange={setReviewRating} />
            </div>
            <div>
              <label className="text-sm font-medium">評論（選填）</label>
              <textarea
                value={reviewContent}
                onChange={(e) => setReviewContent(e.target.value)}
                placeholder="分享你的使用心得"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReview(false)}>取消</Button>
            <Button onClick={handleSubmitReview} disabled={!reviewRating || submittingReview}>
              {submittingReview ? "送出中..." : "送出評價"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
