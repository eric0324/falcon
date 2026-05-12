import { describe, it, expect, vi } from "vitest";

const aggregateMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tokenUsage: {
      aggregate: (...args: unknown[]) => aggregateMock(...args),
    },
    userQuota: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/config", () => ({
  getConfig: vi.fn(() => Promise.resolve("50")),
}));

import { getMonthlyUsage } from "./quota";

describe("getMonthlyUsage", () => {
  it("filters by userId AND excludes NULL userId rows", async () => {
    aggregateMock.mockResolvedValueOnce({ _sum: { costUsd: 5.0 } });

    await getMonthlyUsage("user-A", new Date("2026-05-01"));

    expect(aggregateMock).toHaveBeenCalledWith({
      where: {
        userId: { equals: "user-A", not: null },
        createdAt: { gte: new Date("2026-05-01") },
      },
      _sum: { costUsd: true },
    });
  });

  it("returns the aggregated cost", async () => {
    aggregateMock.mockResolvedValueOnce({ _sum: { costUsd: 12.34 } });
    const result = await getMonthlyUsage("user-A", new Date());
    expect(result).toBe(12.34);
  });

  it("returns 0 when no rows match", async () => {
    aggregateMock.mockResolvedValueOnce({ _sum: { costUsd: null } });
    const result = await getMonthlyUsage("user-B", new Date());
    expect(result).toBe(0);
  });
});
