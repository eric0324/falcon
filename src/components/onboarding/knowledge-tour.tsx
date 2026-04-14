"use client";

import type { ReactNode } from "react";
import { PageTour } from "./page-tour";
import { useKnowledgeSteps } from "./steps/knowledge";

export function KnowledgeTour({ children }: { children: ReactNode }) {
  const steps = useKnowledgeSteps();
  return (
    <PageTour pageKey="knowledge" steps={steps}>
      {children}
    </PageTour>
  );
}
