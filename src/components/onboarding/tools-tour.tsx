"use client";

import type { ReactNode } from "react";
import { PageTour } from "./page-tour";
import { toolsSteps } from "./steps/tools";

export function ToolsTour({ children }: { children: ReactNode }) {
  return (
    <PageTour pageKey="tools" steps={toolsSteps}>
      {children}
    </PageTour>
  );
}
