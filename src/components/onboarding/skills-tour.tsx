"use client";

import type { ReactNode } from "react";
import { PageTour } from "./page-tour";
import { useSkillsSteps } from "./steps/skills";

export function SkillsTour({ children }: { children: ReactNode }) {
  const steps = useSkillsSteps();
  return (
    <PageTour pageKey="skills" steps={steps}>
      {children}
    </PageTour>
  );
}
