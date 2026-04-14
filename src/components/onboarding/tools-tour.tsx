"use client";

import type { ReactNode } from "react";
import { PageTour } from "./page-tour";
import { useToolsSteps } from "./steps/tools";

export function ToolsTour({ children }: { children: ReactNode }) {
  const steps = useToolsSteps();
  return (
    <PageTour pageKey="tools" steps={steps}>
      {children}
    </PageTour>
  );
}
