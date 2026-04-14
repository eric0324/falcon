"use client";

import type { ReactNode } from "react";
import { PageTour } from "./page-tour";
import { marketplaceSteps } from "./steps/marketplace";

export function MarketplaceTour({ children }: { children: ReactNode }) {
  return (
    <PageTour pageKey="marketplace" steps={marketplaceSteps}>
      {children}
    </PageTour>
  );
}
