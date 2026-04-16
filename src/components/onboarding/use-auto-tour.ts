"use client";

import { useEffect } from "react";
import { useTour } from "@reactour/tour";
import { shouldAutoOpenTour, markTourSeen, markTourActiveThisSession } from "./tour-storage";

export function useAutoTour(pageKey: string) {
  const { setIsOpen, setCurrentStep } = useTour();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const forced = params.get("tour") === "1";
    const canAuto = forced || shouldAutoOpenTour(pageKey, window.localStorage);
    if (!canAuto) return;

    setCurrentStep(0);
    setIsOpen(true);
    markTourSeen(pageKey, window.localStorage);
    markTourActiveThisSession(window.sessionStorage);

    if (forced) {
      params.delete("tour");
      const qs = params.toString();
      const url = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
      window.history.replaceState(null, "", url);
    }
  }, [pageKey, setIsOpen, setCurrentStep]);
}
