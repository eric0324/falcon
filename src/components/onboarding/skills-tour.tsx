"use client";

import type { ReactNode } from "react";
import { PageTour } from "./page-tour";
import { skillsSteps } from "./steps/skills";

export function SkillsTour({ children }: { children: ReactNode }) {
  return (
    <PageTour pageKey="skills" steps={skillsSteps}>
      {children}
    </PageTour>
  );
}
