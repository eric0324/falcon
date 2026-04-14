"use client";

import type { ReactNode } from "react";
import { PageTour } from "./page-tour";
import { knowledgeSteps } from "./steps/knowledge";

export function KnowledgeTour({ children }: { children: ReactNode }) {
  return (
    <PageTour pageKey="knowledge" steps={knowledgeSteps}>
      {children}
    </PageTour>
  );
}
