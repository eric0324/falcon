"use client";

import type { StepType } from "@reactour/tour";
import type { ReactNode } from "react";
import { OnboardingTourProvider } from "./tour-provider";
import { TourButton } from "./tour-button";
import { useAutoTour } from "./use-auto-tour";

interface PageTourProps {
  pageKey: string;
  steps: StepType[];
  children: ReactNode;
  buttonClassName?: string;
  hideButton?: boolean;
}

function TourAutoOpener({ pageKey }: { pageKey: string }) {
  useAutoTour(pageKey);
  return null;
}

export function PageTour({ pageKey, steps, children, buttonClassName, hideButton }: PageTourProps) {
  return (
    <OnboardingTourProvider steps={steps}>
      <TourAutoOpener pageKey={pageKey} />
      {!hideButton && (
        <TourButton
          className={buttonClassName ?? "fixed bottom-4 right-4 z-40 shadow-md"}
        />
      )}
      {children}
    </OnboardingTourProvider>
  );
}
