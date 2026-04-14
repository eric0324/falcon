"use client";

import { TourProvider as ReactourProvider, type StepType } from "@reactour/tour";
import type { ReactNode } from "react";

interface OnboardingTourProviderProps {
  steps: StepType[];
  children: ReactNode;
}

export function OnboardingTourProvider({ steps, children }: OnboardingTourProviderProps) {
  return (
    <ReactourProvider
      steps={steps}
      showBadge={false}
      showCloseButton
      disableInteraction={false}
      padding={{ mask: 6, popover: 12 }}
      styles={{
        popover: (base) => ({
          ...base,
          borderRadius: 12,
          padding: "20px 24px 16px",
          fontSize: 14,
          lineHeight: 1.6,
          boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
          maxWidth: 360,
          background: "hsl(var(--popover))",
          color: "hsl(var(--popover-foreground))",
          border: "1px solid hsl(var(--border))",
        }),
        maskArea: (base) => ({
          ...base,
          rx: 8,
          stroke: "hsl(var(--primary))",
          strokeWidth: 2,
        }),
        maskWrapper: (base) => ({ ...base, color: "rgba(0,0,0,0.65)" }),
        highlightedArea: (base) => ({
          ...base,
          stroke: "hsl(var(--primary))",
          strokeWidth: 2,
        }),
        badge: (base) => ({
          ...base,
          background: "hsl(var(--primary))",
          color: "hsl(var(--primary-foreground))",
        }),
        controls: (base) => ({ ...base, marginTop: 12 }),
        close: (base) => ({
          ...base,
          color: "hsl(var(--muted-foreground))",
          right: 10,
          top: 10,
        }),
        dot: (base, state) => ({
          ...base,
          background: state?.current ? "hsl(var(--primary))" : "hsl(var(--muted))",
          border: "none",
        }),
      }}
      prevButton={({ currentStep, setCurrentStep }) =>
        currentStep === 0 ? null : (
          <button
            onClick={() => setCurrentStep(currentStep - 1)}
            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
          >
            上一步
          </button>
        )
      }
      nextButton={({ currentStep, stepsLength, setCurrentStep }) => {
        const isLast = currentStep === stepsLength - 1;
        if (isLast) return null;
        return (
          <button
            onClick={() => setCurrentStep(currentStep + 1)}
            className="text-xs bg-primary text-primary-foreground rounded-md px-3 py-1.5 hover:opacity-90"
          >
            下一步
          </button>
        );
      }}
    >
      {children}
    </ReactourProvider>
  );
}
