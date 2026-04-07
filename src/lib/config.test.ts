import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma
const mockFindUnique = vi.fn();
const mockUpsert = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    systemConfig: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      upsert: (...args: unknown[]) => mockUpsert(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
  },
}));

// Mock encryption
vi.mock("@/lib/encryption", () => ({
  encrypt: (text: string) => `encrypted:${text}`,
  decrypt: (text: string) => text.replace("encrypted:", ""),
}));

import {
  getConfig,
  getConfigRequired,
  setConfig,
  deleteConfig,
  invalidateConfigCache,
} from "./config";

describe("config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateConfigCache();
    // Clear any env vars we set in tests
    delete process.env.__TEST_CONFIG_KEY__;
  });

  describe("getConfig", () => {
    it("returns decrypted value from DB when found", async () => {
      mockFindUnique.mockResolvedValue({
        key: "ANTHROPIC_API_KEY",
        value: "encrypted:sk-test",
        encrypted: true,
      });

      const result = await getConfig("ANTHROPIC_API_KEY");
      expect(result).toBe("sk-test");
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { key: "ANTHROPIC_API_KEY" },
      });
    });

    it("returns raw value from DB when not encrypted", async () => {
      mockFindUnique.mockResolvedValue({
        key: "ALLOWED_EMAIL_DOMAIN",
        value: "example.com",
        encrypted: false,
      });

      const result = await getConfig("ALLOWED_EMAIL_DOMAIN");
      expect(result).toBe("example.com");
    });

    it("returns undefined when DB has no record", async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await getConfig("NONEXISTENT_KEY");
      expect(result).toBeUndefined();
    });

    it("returns undefined when DB throws", async () => {
      mockFindUnique.mockRejectedValue(new Error("DB connection failed"));

      const result = await getConfig("__TEST_CONFIG_KEY__");
      expect(result).toBeUndefined();
    });

    it("caches results for subsequent calls", async () => {
      mockFindUnique.mockResolvedValue({
        key: "SOME_KEY",
        value: "encrypted:cached-value",
        encrypted: true,
      });

      await getConfig("SOME_KEY");
      await getConfig("SOME_KEY");

      expect(mockFindUnique).toHaveBeenCalledTimes(1);
    });
  });

  describe("getConfigRequired", () => {
    it("returns value when config exists", async () => {
      mockFindUnique.mockResolvedValue({
        key: "GOOGLE_CLIENT_ID",
        value: "client-id",
        encrypted: false,
      });

      const result = await getConfigRequired("GOOGLE_CLIENT_ID");
      expect(result).toBe("client-id");
    });

    it("throws when config is missing", async () => {
      mockFindUnique.mockResolvedValue(null);

      await expect(getConfigRequired("MISSING_KEY")).rejects.toThrow(
        "Missing required config: MISSING_KEY"
      );
    });
  });

  describe("setConfig", () => {
    it("encrypts and upserts value to DB", async () => {
      mockUpsert.mockResolvedValue({});

      await setConfig("ANTHROPIC_API_KEY", "sk-new-key", {
        userId: "user-1",
      });

      expect(mockUpsert).toHaveBeenCalledWith({
        where: { key: "ANTHROPIC_API_KEY" },
        create: expect.objectContaining({
          key: "ANTHROPIC_API_KEY",
          value: "encrypted:sk-new-key",
          encrypted: true,
          group: "anthropic",
          updatedBy: "user-1",
        }),
        update: expect.objectContaining({
          value: "encrypted:sk-new-key",
          encrypted: true,
        }),
      });
    });

    it("stores unencrypted when encrypted=false", async () => {
      mockUpsert.mockResolvedValue({});

      await setConfig("ALLOWED_EMAIL_DOMAIN", "example.com", {
        encrypted: false,
      });

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            value: "example.com",
            encrypted: false,
          }),
        })
      );
    });

    it("invalidates cache after set", async () => {
      // Prime cache
      mockFindUnique.mockResolvedValue({
        key: "KEY",
        value: "encrypted:old",
        encrypted: true,
      });
      await getConfig("KEY");

      // Set new value
      mockUpsert.mockResolvedValue({});
      await setConfig("KEY", "new-value");

      // Next read should hit DB again
      mockFindUnique.mockResolvedValue({
        key: "KEY",
        value: "encrypted:new-value",
        encrypted: true,
      });
      const result = await getConfig("KEY");
      expect(result).toBe("new-value");
      expect(mockFindUnique).toHaveBeenCalledTimes(2);
    });

    it("auto-detects group from CONFIG_DEFINITIONS", async () => {
      mockUpsert.mockResolvedValue({});

      await setConfig("NOTION_TOKEN", "ntn_xxx");

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ group: "notion" }),
        })
      );
    });
  });

  describe("deleteConfig", () => {
    it("deletes from DB and clears cache", async () => {
      mockDelete.mockResolvedValue({});

      // Prime cache
      mockFindUnique.mockResolvedValue({
        key: "KEY",
        value: "val",
        encrypted: false,
      });
      await getConfig("KEY");

      await deleteConfig("KEY");

      expect(mockDelete).toHaveBeenCalledWith({ where: { key: "KEY" } });

      // Next read should hit DB
      mockFindUnique.mockResolvedValue(null);
      const result = await getConfig("KEY");
      expect(result).toBeUndefined();
    });
  });

  describe("invalidateConfigCache", () => {
    it("clears all cached values", async () => {
      mockFindUnique.mockResolvedValue({
        key: "A",
        value: "encrypted:val-a",
        encrypted: true,
      });
      await getConfig("A");

      invalidateConfigCache();

      mockFindUnique.mockResolvedValue({
        key: "A",
        value: "encrypted:val-b",
        encrypted: true,
      });
      const result = await getConfig("A");
      expect(result).toBe("val-b");
      expect(mockFindUnique).toHaveBeenCalledTimes(2);
    });
  });
});
