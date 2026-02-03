"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import { StarRating } from "./star-rating";
import { UserAvatar } from "./user-avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, CornerDownRight } from "lucide-react";

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

interface ReviewListProps {
  reviews: Review[];
  toolAuthorId: string;
  currentUserId?: string;
  onReplySubmit?: () => void;
}

export function ReviewList({
  reviews,
  toolAuthorId,
  currentUserId,
  onReplySubmit,
}: ReviewListProps) {
  const t = useTranslations("review");
  const tCommon = useTranslations("common");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isToolAuthor = currentUserId === toolAuthorId;

  const handleSubmitReply = async (reviewId: string) => {
    if (!replyContent.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyContent }),
      });

      if (res.ok) {
        setReplyContent("");
        setReplyingTo(null);
        onReplySubmit?.();
      }
    } catch (err) {
      console.error("Failed to submit reply:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("list.empty")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <div key={review.id} className="border rounded-lg p-4">
          <div className="flex items-start gap-3">
            <UserAvatar
              src={review.user.image}
              name={review.user.name}
              size="md"
              className="w-10 h-10"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{review.user.name || tCommon("anonymous")}</span>
                <StarRating value={review.rating} readonly size="sm" />
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(review.createdAt), {
                    addSuffix: true,
                    locale: zhTW,
                  })}
                </span>
              </div>
              {review.content && (
                <p className="mt-2 text-sm">{review.content}</p>
              )}

              {/* Replies */}
              {review.replies.length > 0 && (
                <div className="mt-4 space-y-3">
                  {review.replies.map((reply) => (
                    <div
                      key={reply.id}
                      className="flex items-start gap-2 pl-4 border-l-2 border-muted"
                    >
                      <CornerDownRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                      <UserAvatar
                        src={reply.user.image}
                        name={reply.user.name}
                        size="md"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {reply.user.name || t("list.author")}
                          </span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                            {t("list.author")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(reply.createdAt), {
                              addSuffix: true,
                              locale: zhTW,
                            })}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{reply.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply button for tool author */}
              {isToolAuthor && review.replies.length === 0 && (
                <div className="mt-3">
                  {replyingTo === review.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder={t("list.replyPlaceholder")}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSubmitReply(review.id)}
                          disabled={isSubmitting || !replyContent.trim()}
                        >
                          {isSubmitting ? tCommon("submitting") : tCommon("submit")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyContent("");
                          }}
                        >
                          {tCommon("cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyingTo(review.id)}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      {t("list.reply")}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
