"use client";

import { useTour } from "@reactour/tour";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TourButtonProps {
  className?: string;
  label?: string;
}

export function TourButton({ className, label = "操作說明" }: TourButtonProps) {
  const { setIsOpen, setCurrentStep } = useTour();

  return (
    <button
      type="button"
      onClick={() => {
        setCurrentStep(0);
        setIsOpen(true);
      }}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white/80 backdrop-blur",
        "px-2.5 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 hover:bg-white transition-colors",
        "dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-neutral-300",
        className,
      )}
    >
      <HelpCircle className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
