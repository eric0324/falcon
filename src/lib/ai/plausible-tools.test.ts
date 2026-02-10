import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/integrations/plausible", () => ({
  isPlausibleConfigured: vi.fn(() => true),
  getRealtimeVisitors: vi.fn(),
  queryAggregate: vi.fn(),
  queryTimeseries: vi.fn(),
  queryBreakdown: vi.fn(),
}));

import { createPlausibleTools } from "./plausible-tools";
import {
  isPlausibleConfigured,
  getRealtimeVisitors,
  queryAggregate,
  queryTimeseries,
  queryBreakdown,
} from "@/lib/integrations/plausible";

const mockIsConfigured = vi.mocked(isPlausibleConfigured);
const mockRealtime = vi.mocked(getRealtimeVisitors);
const mockAggregate = vi.mocked(queryAggregate);
const mockTimeseries = vi.mocked(queryTimeseries);
const mockBreakdown = vi.mocked(queryBreakdown);

beforeEach(() => {
  vi.clearAllMocks();
  mockIsConfigured.mockReturnValue(true);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeTool(params: Record<string, unknown>): Promise<any> {
  const tools = createPlausibleTools();
  return tools.plausibleQuery.execute!(
    params as never,
    { toolCallId: "test", messages: [], abortSignal: undefined as never }
  );
}

describe("plausibleQuery tool", () => {
  describe("not configured", () => {
    it("returns error when Plausible is not configured", async () => {
      mockIsConfigured.mockReturnValue(false);
      const result = await executeTool({ action: "realtime" });
      expect(result.success).toBe(false);
      expect(result.needsConnection).toBe(true);
      expect(result.service).toBe("plausible");
    });
  });

  describe("action: realtime", () => {
    it("returns current visitor count", async () => {
      mockRealtime.mockResolvedValueOnce(42);
      const result = await executeTool({ action: "realtime" });
      expect(result.success).toBe(true);
      expect(result.service).toBe("plausible");
      expect(result.data).toEqual({ visitors: 42 });
    });
  });

  describe("action: aggregate", () => {
    it("returns aggregate metrics for a date range", async () => {
      mockAggregate.mockResolvedValueOnce({
        visitors: 1200,
        pageviews: 3400,
        visits: 1800,
        bounceRate: 45.2,
        visitDuration: 120,
        viewsPerVisit: 1.9,
      });

      const result = await executeTool({ action: "aggregate", dateRange: "30d" });
      expect(result.success).toBe(true);
      expect(result.data.visitors).toBe(1200);
      expect(mockAggregate).toHaveBeenCalledWith("30d", {}, undefined, undefined);
    });

    it("passes filters to queryAggregate", async () => {
      mockAggregate.mockResolvedValueOnce({
        visitors: 100,
        pageviews: 200,
        visits: 150,
        bounceRate: 30,
        visitDuration: 90,
        viewsPerVisit: 1.3,
      });

      await executeTool({
        action: "aggregate",
        dateRange: "7d",
        page: "/blog",
        source: "Google",
      });

      expect(mockAggregate).toHaveBeenCalledWith(
        "7d",
        { page: "/blog", source: "Google" },
        undefined,
        undefined
      );
    });

    it("passes custom date range", async () => {
      mockAggregate.mockResolvedValueOnce({
        visitors: 500,
        pageviews: 1000,
        visits: 700,
        bounceRate: 40,
        visitDuration: 100,
        viewsPerVisit: 1.4,
      });

      await executeTool({
        action: "aggregate",
        dateRange: "custom",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
      });

      expect(mockAggregate).toHaveBeenCalledWith(
        "custom",
        {},
        "2026-01-01",
        "2026-01-31"
      );
    });
  });

  describe("action: timeseries", () => {
    it("returns time series data", async () => {
      mockTimeseries.mockResolvedValueOnce([
        { date: "2026-02-01", visitors: 100, pageviews: 250 },
        { date: "2026-02-02", visitors: 120, pageviews: 300 },
      ]);

      const result = await executeTool({
        action: "timeseries",
        dateRange: "7d",
        period: "day",
      });

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
        { dimension: "Google", visitors: 500, pageviews: 1200 },
        { dimension: "Facebook", visitors: 300, pageviews: 600 },
      ]);

      const result = await executeTool({
        action: "breakdown",
        dimension: "source",
        dateRange: "7d",
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].dimension).toBe("Google");
      expect(mockBreakdown).toHaveBeenCalledWith("source", "7d", {}, 10, undefined, undefined);
    });

    it("passes limit and filters", async () => {
      mockBreakdown.mockResolvedValueOnce([]);

      await executeTool({
        action: "breakdown",
        dimension: "page",
        dateRange: "30d",
        source: "Google",
        limit: 5,
      });

      expect(mockBreakdown).toHaveBeenCalledWith(
        "page",
        "30d",
        { source: "Google" },
        5,
        undefined,
        undefined
      );
    });
  });

  describe("error handling", () => {
    it("catches and returns errors", async () => {
      mockRealtime.mockRejectedValueOnce(new Error("API rate limited"));

      const result = await executeTool({ action: "realtime" });
      expect(result.success).toBe(false);
      expect(result.error).toBe("API rate limited");
      expect(result.service).toBe("plausible");
    });
  });
});
