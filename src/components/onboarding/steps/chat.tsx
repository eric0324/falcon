"use client";

import type { StepType } from "@reactour/tour";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

function FinalStep({ setIsOpen }: { setIsOpen: (v: boolean) => void }) {
  const router = useRouter();
  const t = useTranslations("onboarding");
  return (
    <div className="space-y-3">
      <p>{t("chat.finishText")}</p>
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md"
        >
          {t("finish")}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            router.push("/skills?tour=1");
          }}
          className="inline-flex items-center gap-1 text-xs bg-primary text-primary-foreground rounded-md px-3 py-1.5 hover:opacity-90"
        >
          {t("chat.finishCta")}
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

const centeredStyles = {
  maskArea: (base: Record<string, unknown>) => ({ ...base, display: "none" }),
  maskWrapper: (base: Record<string, unknown>) => ({ ...base, color: "rgba(0,0,0,0.65)" }),
};

export function useChatSteps(): StepType[] {
  const t = useTranslations("onboarding.chat");
  return [
    {
      selector: "body",
      position: "center",
      highlightedSelectors: [],
      mutationObservables: [],
      content: t("welcome"),
      styles: centeredStyles,
    },
    { selector: '[data-tour="chat-model"]', content: t("model") },
    { selector: '[data-tour="chat-image-provider"]', content: t("imageProvider") },
    { selector: '[data-tour="chat-skill"]', content: t("skill") },
    { selector: '[data-tour="chat-data-sources"]', content: t("dataSources") },
    { selector: '[data-tour="chat-input"]', content: t("input") },
    {
      selector: "body",
      position: "center",
      highlightedSelectors: [],
      mutationObservables: [],
      content: ({ setIsOpen }) => <FinalStep setIsOpen={setIsOpen} />,
      styles: centeredStyles,
    },
  ];
}
