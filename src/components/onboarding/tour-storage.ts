export const TOUR_STORAGE_PREFIX = "tour:";
export const TOUR_ACTIVE_SESSION_KEY = "tour:__active_session__";

export function shouldAutoOpenTour(pageKey: string, storage: Storage | null): boolean {
  if (!storage) return false;
  return storage.getItem(TOUR_STORAGE_PREFIX + pageKey) !== "seen";
}

export function markTourSeen(pageKey: string, storage: Storage | null): void {
  if (!storage) return;
  storage.setItem(TOUR_STORAGE_PREFIX + pageKey, "seen");
}

export function markTourActiveThisSession(storage: Storage | null): void {
  if (!storage) return;
  storage.setItem(TOUR_ACTIVE_SESSION_KEY, "1");
}

export function isTourActiveThisSession(storage: Storage | null): boolean {
  if (!storage) return false;
  return storage.getItem(TOUR_ACTIVE_SESSION_KEY) === "1";
}
