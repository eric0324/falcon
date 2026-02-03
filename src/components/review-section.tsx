"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ReviewForm } from "./review-form";
import { ReviewList } from "./review-list";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Review {
  id: string;
  rating: number;
  content: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
  replies: Array<{
    id: string;
    content: string;
    createdAt: string;
    user: {
      id: string;
      name: string | null;
      image: string | null;
    };
  }>;
}

interface ReviewSectionProps {
  toolId: string;
  toolAuthorId: string;
  currentUserId: string;
  existingReview: { rating: number; content: string | null } | null;
  canReview: boolean;
}

export function ReviewSection({
  toolId,
  toolAuthorId,
  currentUserId,
  existingReview,
  canReview,
}: ReviewSectionProps) {
  const t = useTranslations("review");
  const tCommon = useTranslations("common");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [sort, setSort] = useState("newest");
  const [isLoading, setIsLoading] = useState(true);

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch(`/api/tools/${toolId}/reviews?sort=${sort}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
      }
    } catch (err) {
      console.error("Failed to fetch reviews:", err);
    } finally {
      setIsLoading(false);
    }
  }, [toolId, sort]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t("sort.newest")}</SelectItem>
            <SelectItem value="rating">{t("sort.rating")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Review Form */}
      {canReview && (
        <div className="mb-8 p-4 border rounded-lg">
          <h3 className="font-medium mb-4">
            {existingReview ? t("form.updateTitle") : t("form.createTitle")}
          </h3>
          <ReviewForm
            toolId={toolId}
            existingReview={existingReview || undefined}
            onSuccess={fetchReviews}
          />
        </div>
      )}

      {/* Review List */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          {tCommon("loading")}
        </div>
      ) : (
        <ReviewList
          reviews={reviews}
          toolAuthorId={toolAuthorId}
          currentUserId={currentUserId}
          onReplySubmit={fetchReviews}
        />
      )}
    </div>
  );
}
