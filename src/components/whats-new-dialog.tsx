"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { changelog, CURRENT_VERSION } from "@/lib/changelog";

const LS_KEY = "falcon-last-seen-version";

function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
      {Array.from({ length: 50 }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 1.5;
        const duration = 2.5 + Math.random() * 2;
        const size = 5 + Math.random() * 5;
        const colors = [
          "#fbbf24", "#f472b6", "#60a5fa", "#34d399",
          "#a78bfa", "#fb923c", "#f87171", "#22d3ee",
          "#e879f9", "#fcd34d",
        ];
        const color = colors[i % colors.length];
        const rotation = Math.random() * 360;
        const drift = (Math.random() - 0.5) * 100;

        return (
          <div
            key={i}
            className="absolute rounded-[1px]"
            style={{
              left: `${left}%`,
              top: "-8px",
              width: `${size}px`,
              height: `${size * 0.5}px`,
              backgroundColor: color,
              opacity: 0,
              animation: `confetti-fall ${duration}s ease-in ${delay}s forwards`,
              // @ts-expect-error CSS custom property
              "--drift": `${drift}px`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(500px) translateX(var(--drift)) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

export function WhatsNewDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const lastSeen = localStorage.getItem(LS_KEY);
    if (lastSeen !== CURRENT_VERSION) {
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(LS_KEY, CURRENT_VERSION);
    setOpen(false);
  };

  const latest = changelog[0];
  if (!latest) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0 border shadow-2xl [&>button]:hidden">
        <Confetti />

        <div className="relative z-10 grid grid-cols-[2fr_3fr] min-h-[340px]">
          {/* Left — celebration visual */}
          <div className="relative flex flex-col items-center justify-center bg-muted/30 overflow-hidden">
            {/* Decorative rings */}
            <div className="absolute w-64 h-64 rounded-full border border-foreground/[0.03]" />
            <div className="absolute w-48 h-48 rounded-full border border-foreground/[0.04]" />
            <div className="absolute w-32 h-32 rounded-full border border-foreground/[0.05]" />

            <div className="relative">
              <p className="text-7xl">🎉</p>
            </div>

            <p className="relative mt-5 text-[11px] font-semibold tracking-[0.2em] uppercase text-muted-foreground/70">
              What&apos;s New
            </p>
          </div>

          {/* Right — content */}
          <div className="flex flex-col justify-center px-10 py-10">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">
              Falcon {latest.version}
            </p>
            <h2 className="text-[22px] font-bold tracking-tight leading-snug">
              {latest.title}
            </h2>

            <p className="text-[13px] text-muted-foreground leading-relaxed mt-4 whitespace-pre-line">
              {latest.summary}
            </p>

            <button
              onClick={handleClose}
              className="mt-8 self-start py-2.5 px-6 rounded-lg text-sm font-medium border border-border hover:bg-muted/50 transition-colors"
            >
              Enjoy it
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
