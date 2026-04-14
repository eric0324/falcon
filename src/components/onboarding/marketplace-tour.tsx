"use client";

import type { ReactNode } from "react";
import { PageTour } from "./page-tour";
import { useMarketplaceSteps } from "./steps/marketplace";

export function MarketplaceTour({ children }: { children: ReactNode }) {
  const steps = useMarketplaceSteps();
  return (
    <PageTour pageKey="marketplace" steps={steps}>
      {children}
    </PageTour>
  );
}
