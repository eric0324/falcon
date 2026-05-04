"use client";

import { useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface ToolFavoriteButtonProps {
  toolId: string;
  initialFavorited?: boolean;
  size?: "sm" | "md";
  onChange?: (favorited: boolean) => void;
}

export function ToolFavoriteButton({
  toolId,
  initialFavorited = false,
  size = "sm",
  onChange,
}: ToolFavoriteButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, setPending] = useState(false);

  const iconSize = size === "md" ? "h-5 w-5" : "h-4 w-4";
  const buttonSize = size === "md" ? "h-9 w-9" : "h-7 w-7";

  async function handleClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;

    const next = !favorited;
    setFavorited(next);
    setPending(true);
    onChange?.(next);

    try {
      const res = await fetch(`/api/tools/${toolId}/favorite`, {
        method: next ? "POST" : "DELETE",
      });

      if (res.status === 401) {
        toast({
          title: "請先登入才能收藏",
          variant: "destructive",
        });
        setFavorited(!next);
        onChange?.(!next);
        router.push("/login");
        return;
      }

      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }
    } catch (err) {
      console.error("Favorite toggle failed:", err);
      setFavorited(!next);
      onChange?.(!next);
      toast({
        title: next ? "收藏失敗，請稍後再試" : "取消收藏失敗，請稍後再試",
        variant: "destructive",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label={favorited ? "取消收藏" : "收藏"}
      aria-pressed={favorited}
      className={cn(
        "inline-flex items-center justify-center rounded-full transition-colors shrink-0",
        buttonSize,
        "hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed",
        favorited
          ? "text-rose-500"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Heart
        className={cn(iconSize, favorited && "fill-rose-500")}
        strokeWidth={2}
      />
    </button>
  );
}
