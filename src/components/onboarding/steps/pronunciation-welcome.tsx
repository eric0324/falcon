"use client";

import { useRef } from "react";
import { Volume2 } from "lucide-react";
import { useTranslations } from "next-intl";

export function PronunciationWelcome() {
  const t = useTranslations("onboarding.marketplace");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = () => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = 0;
    void el.play();
  };

  return (
    <div className="space-y-3">
      <p>{t("welcome")}</p>
      <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
        <button
          type="button"
          onClick={play}
          aria-label={t("playPronunciation")}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90"
        >
          <Volume2 className="h-4 w-4" />
        </button>
        <div className="flex flex-col">
          <span className="text-sm font-medium">Falcon</span>
          <span className="text-xs text-muted-foreground">{t("phonetic")}</span>
        </div>
        <audio ref={audioRef} src="/audio/falcon.mp3" preload="auto" />
      </div>
    </div>
  );
}
