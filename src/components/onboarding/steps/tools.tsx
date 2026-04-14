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
      <p>{t("tools.finishText")}</p>
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
            router.push("/knowledge?tour=1");
          }}
          className="inline-flex items-center gap-1 text-xs bg-primary text-primary-foreground rounded-md px-3 py-1.5 hover:opacity-90"
        >
          {t("tools.finishCta")}
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

export function useToolsSteps(): StepType[] {
  const t = useTranslations("onboarding.tools");
  return [
    {
      selector: "body",
      position: "center",
      highlightedSelectors: [],
      mutationObservables: [],
      content: t("welcome"),
      styles: centeredStyles,
    },
    { selector: '[data-tour="tools-create"]', content: t("create") },
    { selector: '[data-tour="tools-card"]', content: t("card") },
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
