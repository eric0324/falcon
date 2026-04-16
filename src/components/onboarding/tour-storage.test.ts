import { describe, it, expect, beforeEach } from "vitest";
import {
  shouldAutoOpenTour,
  markTourSeen,
  TOUR_STORAGE_PREFIX,
  markTourAutoOpenedThisPageLoad,
  isTourAutoOpenedThisPageLoad,
  __resetTourAutoOpenedFlagForTests,
} from "./tour-storage";

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (k) => (store.has(k) ? (store.get(k) as string) : null),
    key: (i) => Array.from(store.keys())[i] ?? null,
    removeItem: (k) => {
      store.delete(k);
    },
    setItem: (k, v) => {
      store.set(k, v);
    },
  };
}

describe("tour-storage", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  describe("shouldAutoOpenTour", () => {
    it("returns true when the page's tour has never been seen", () => {
      expect(shouldAutoOpenTour("marketplace", storage)).toBe(true);
    });

    it("returns false after the page's tour has been marked seen", () => {
      markTourSeen("marketplace", storage);
      expect(shouldAutoOpenTour("marketplace", storage)).toBe(false);
    });

    it("treats each pageKey independently", () => {
      markTourSeen("marketplace", storage);
      expect(shouldAutoOpenTour("chat", storage)).toBe(true);
    });

    it("returns false when storage is unavailable", () => {
      expect(shouldAutoOpenTour("marketplace", null)).toBe(false);
    });
  });

  describe("markTourSeen", () => {
    it("writes the expected key into storage", () => {
      markTourSeen("marketplace", storage);
      expect(storage.getItem(`${TOUR_STORAGE_PREFIX}marketplace`)).toBe("seen");
    });

    it("is a no-op when storage is unavailable", () => {
      expect(() => markTourSeen("marketplace", null)).not.toThrow();
    });
  });

  describe("tour auto-opened this page load flag", () => {
    beforeEach(() => {
      __resetTourAutoOpenedFlagForTests();
    });

    it("isTourAutoOpenedThisPageLoad returns false initially", () => {
      expect(isTourAutoOpenedThisPageLoad()).toBe(false);
    });

    it("isTourAutoOpenedThisPageLoad returns true after mark", () => {
      markTourAutoOpenedThisPageLoad();
      expect(isTourAutoOpenedThisPageLoad()).toBe(true);
    });

    it("flag persists across multiple reads within the same page load", () => {
      markTourAutoOpenedThisPageLoad();
      expect(isTourAutoOpenedThisPageLoad()).toBe(true);
      expect(isTourAutoOpenedThisPageLoad()).toBe(true);
    });

    it("__resetTourAutoOpenedFlagForTests clears the flag", () => {
      markTourAutoOpenedThisPageLoad();
      __resetTourAutoOpenedFlagForTests();
      expect(isTourAutoOpenedThisPageLoad()).toBe(false);
    });
  });
});
