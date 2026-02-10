import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/integrations/ga4", () => ({
  isGA4Configured: vi.fn(() => true),
  getRealtimeUsers: vi.fn(),
  queryAggregate: vi.fn(),
  queryTimeseries: vi.fn(),
  queryBreakdown: vi.fn(),
}));

import { createGA4Tools } from "./ga4-tools";
import {
  isGA4Configured,
  getRealtimeUsers,
  queryAggregate,
  queryTimeseries,
  queryBreakdown,
} from "@/lib/integrations/ga4";

const mockIsConfigured = vi.mocked(isGA4Configured);
const mockRealtime = vi.mocked(getRealtimeUsers);
const mockAggregate = vi.mocked(queryAggregate);
const mockTimeseries = vi.mocked(queryTimeseries);
const mockBreakdown = vi.mocked(queryBreakdown);

beforeEach(() => {
  vi.clearAllMocks();
  mockIsConfigured.mockReturnValue(true);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeTool(params: Record<string, unknown>): Promise<any> {
  const tools = createGA4Tools();
  return tools.ga4Query.execute!(
    params as never,
    { toolCallId: "test", messages: [], abortSignal: undefined as never }
  );
}

describe("ga4Query tool", () => {
  describe("not configured", () => {
    it("returns error when GA4 is not configured", async () => {
      mockIsConfigured.mockReturnValue(false);
      const result = await executeTool({ action: "realtime" });
      expect(result.success).toBe(false);
      expect(result.needsConnection).toBe(true);
      expect(result.service).toBe("ga4");
    });
  });

  describe("action: realtime", () => {
    it("returns current active user count", async () => {
      mockRealtime.mockResolvedValueOnce(42);
      const result = await executeTool({ action: "realtime" });
      expect(result.success).toBe(true);
      expect(result.service).toBe("ga4");
      expect(result.data).toEqual({ activeUsers: 42 });
    });
  });

  describe("action: aggregate", () => {
    it("returns aggregate metrics for a date range", async () => {
      mockAggregate.mockResolvedValueOnce({
        activeUsers: 1200,
        screenPageViews: 3400,
        sessions: 1800,
        bounceRate: 0.452,
        averageSessionDuration: 120.5,
        sessionsPerUser: 1.9,
      });

      const result = await executeTool({ action: "aggregate", dateRange: "30d" });
      expect(result.success).toBe(true);
      expect(result.data.activeUsers).toBe(1200);
      expect(mockAggregate).toHaveBeenCalledWith("30d", {}, undefined, undefined);
    });

    it("passes filters to queryAggregate", async () => {
      mockAggregate.mockResolvedValueOnce({
        activeUsers: 100, screenPageViews: 200, sessions: 150,
        bounceRate: 0.3, averageSessionDuration: 90, sessionsPerUser: 1.3,
      });

      await executeTool({
        action: "aggregate", dateRange: "7d",
        page: "/blog", source: "google",
      });

      expect(mockAggregate).toHaveBeenCalledWith(
        "7d", { page: "/blog", source: "google" }, undefined, undefined
      );
    });

    it("passes custom date range", async () => {
      mockAggregate.mockResolvedValueOnce({
        activeUsers: 500, screenPageViews: 1000, sessions: 700,
        bounceRate: 0.4, averageSessionDuration: 100, sessionsPerUser: 1.4,
      });

      await executeTool({
        action: "aggregate", dateRange: "custom",
        startDate: "2026-01-01", endDate: "2026-01-31",
      });

      expect(mockAggregate).toHaveBeenCalledWith(
        "custom", {}, "2026-01-01", "2026-01-31"
      );
    });
  });

  describe("action: timeseries", () => {
    it("returns time series data", async () => {
      mockTimeseries.mockResolvedValueOnce([
        { date: "2026-02-01", activeUsers: 100, screenPageViews: 250 },
        { date: "2026-02-02", activeUsers: 120, screenPageViews: 300 },
      ]);

      const result = await executeTool({ action: "timeseries", dateRange: "7d", period: "day" });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(mockTimeseries).toHaveBeenCalledWith("7d", "day", {}, undefined, undefined);
    });

    it("defaults period to day", async () => {
      mockTimeseries.mockResolvedValueOnce([]);
      await executeTool({ action: "timeseries", dateRange: "30d" });
      expect(mockTimeseries).toHaveBeenCalledWith("30d", "day", {}, undefined, undefined);
    });
  });

  describe("action: breakdown", () => {
    it("returns breakdown by dimension", async () => {
      mockBreakdown.mockResolvedValueOnce([
        { dimension: "google", activeUsers: 500, screenPageViews: 1200 },
        { dimension: "facebook", activeUsers: 300, screenPageViews: 600 },
      ]);

      const result = await executeTool({ action: "breakdown", dimension: "source", dateRange: "7d" });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(mockBreakdown).toHaveBeenCalledWith("source", "7d", {}, 10, undefined, undefined);
    });

    it("passes limit and filters", async () => {
      mockBreakdown.mockResolvedValueOnce([]);
      await executeTool({
        action: "breakdown", dimension: "page", dateRange: "30d",
        source: "google", limit: 5,
      });
      expect(mockBreakdown).toHaveBeenCalledWith(
        "page", "30d", { source: "google" }, 5, undefined, undefined
      );
    });
  });

  describe("error handling", () => {
    it("catches and returns errors", async () => {
      mockRealtime.mockRejectedValueOnce(new Error("Permission denied"));
      const result = await executeTool({ action: "realtime" });
      expect(result.success).toBe(false);
      expect(result.error).toBe("Permission denied");
      expect(result.service).toBe("ga4");
    });
  });
});
