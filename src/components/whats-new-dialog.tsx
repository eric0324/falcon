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
        const duration = 2 + Math.random() * 2;
        const size = 5 + Math.random() * 5;
        const colors = [
          "#fbbf24", "#f472b6", "#60a5fa", "#34d399",
          "#a78bfa", "#fb923c", "#f87171", "#22d3ee",
          "#e879f9", "#fcd34d",
        ];
        const color = colors[i % colors.length];
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

function AnimatedVisual() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <style>{`
        @keyframes morph {
          0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
          25% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
          50% { border-radius: 50% 60% 30% 60% / 30% 40% 70% 60%; }
          75% { border-radius: 60% 30% 60% 40% / 70% 60% 40% 30%; }
        }
        @keyframes float-1 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(12px, -18px); } }
        @keyframes float-2 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-15px, 12px); } }
        @keyframes float-3 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(8px, 15px); } }
        @keyframes orbit {
          0% { transform: rotate(0deg) translateX(68px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(68px) rotate(-360deg); }
        }
        @keyframes orbit-reverse {
          0% { transform: rotate(0deg) translateX(52px) rotate(0deg); }
          100% { transform: rotate(-360deg) translateX(52px) rotate(360deg); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.6; }
          50% { transform: scale(1.1); opacity: 0.15; }
          100% { transform: scale(0.8); opacity: 0.6; }
        }
      `}</style>

      {/* Pulsing rings */}
      <div
        className="absolute w-36 h-36 rounded-full border border-primary/20"
        style={{ animation: "pulse-ring 3s ease-in-out infinite" }}
      />
      <div
        className="absolute w-48 h-48 rounded-full border border-primary/10"
        style={{ animation: "pulse-ring 3s ease-in-out 0.5s infinite" }}
      />

      {/* Morphing gradient blob */}
      <div
        className="absolute w-28 h-28"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary) / 0.4), hsl(262 80% 60% / 0.3), hsl(200 80% 55% / 0.3))",
          animation: "morph 8s ease-in-out infinite",
          filter: "blur(1px)",
        }}
      />

      {/* Floating accent blobs */}
      <div
        className="absolute w-10 h-10 rounded-full"
        style={{
          background: "hsl(262 80% 65% / 0.25)",
          filter: "blur(8px)",
          top: "22%",
          right: "18%",
          animation: "float-1 4s ease-in-out infinite",
        }}
      />
      <div
        className="absolute w-8 h-8 rounded-full"
        style={{
          background: "hsl(200 80% 55% / 0.2)",
          filter: "blur(6px)",
          bottom: "25%",
          left: "20%",
          animation: "float-2 5s ease-in-out infinite",
        }}
      />
      <div
        className="absolute w-6 h-6 rounded-full"
        style={{
          background: "hsl(var(--primary) / 0.2)",
          filter: "blur(5px)",
          top: "35%",
          left: "15%",
          animation: "float-3 3.5s ease-in-out infinite",
        }}
      />

      {/* Orbiting dots */}
      <div className="absolute" style={{ animation: "orbit 6s linear infinite" }}>
        <div className="w-2 h-2 rounded-full bg-primary/60" />
      </div>
      <div className="absolute" style={{ animation: "orbit-reverse 8s linear infinite" }}>
        <div className="w-1.5 h-1.5 rounded-full bg-purple-400/50" />
      </div>
      <div className="absolute" style={{ animation: "orbit 10s linear 2s infinite" }}>
        <div className="w-1 h-1 rounded-full bg-blue-400/50" />
      </div>

      {/* Center sparkle */}
      <svg className="relative w-8 h-8 text-primary/70" viewBox="0 0 24 24" fill="currentColor">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      </svg>
    </div>
  );
}

export function WhatsNewDialog() {
  const [open, setOpen] = useState(false);

  // Find the latest entry that should show the dialog
  const latest = changelog.find((e) => e.showDialog !== false);

  useEffect(() => {
    const lastSeen = localStorage.getItem(LS_KEY);
    if (lastSeen !== CURRENT_VERSION) {
      // Only open dialog if the latest displayable entry is newer than last seen
      if (latest && latest.showDialog !== false) {
        const timer = setTimeout(() => setOpen(true), 800);
        return () => clearTimeout(timer);
      }
      // Still update the stored version so we don't re-check
      localStorage.setItem(LS_KEY, CURRENT_VERSION);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    localStorage.setItem(LS_KEY, CURRENT_VERSION);
    setOpen(false);
  };

  if (!latest) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0 border shadow-2xl [&>button]:hidden">
        <Confetti />

        <div className="relative z-10 grid grid-cols-[2fr_3fr] min-h-[440px]">
          {/* Left — animated visual */}
          <div className="relative bg-muted/20 overflow-hidden flex flex-col items-center justify-center py-10">
            <div className="flex-1 w-full">
              <AnimatedVisual />
            </div>
            <p className="text-sm font-bold tracking-[0.15em] uppercase text-muted-foreground/70">
              What&apos;s New
            </p>
            <p className="text-xs text-muted-foreground/50 mt-1.5">
              Falcon {latest.version}
            </p>
          </div>

          {/* Right — content */}
          <div className="flex flex-col justify-center px-10 py-10">
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
