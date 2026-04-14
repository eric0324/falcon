export const TOUR_STORAGE_PREFIX = "tour:";

export function shouldAutoOpenTour(pageKey: string, storage: Storage | null): boolean {
  if (!storage) return false;
  return storage.getItem(TOUR_STORAGE_PREFIX + pageKey) !== "seen";
}

export function markTourSeen(pageKey: string, storage: Storage | null): void {
  if (!storage) return;
  storage.setItem(TOUR_STORAGE_PREFIX + pageKey, "seen");
}
