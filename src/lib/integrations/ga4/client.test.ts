import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the @google-analytics/data module
const mockRunReport = vi.fn();
const mockRunRealtimeReport = vi.fn();

vi.mock("@google-analytics/data", () => ({
  BetaAnalyticsDataClient: class {
    runReport = mockRunReport;
    runRealtimeReport = mockRunRealtimeReport;
  },
}));

const originalEnv = process.env;

beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
  mockRunReport.mockReset();
  mockRunRealtimeReport.mockReset();
});

afterEach(() => {
  process.env = originalEnv;
});

async function importClient() {
  const mod = await import("./client");
  mod._resetClient();
  return mod;
}

describe("isGA4Configured", () => {
  it("returns true when all credentials are set", async () => {
    process.env.GA4_CLIENT_EMAIL = "test@project.iam.gserviceaccount.com";
    process.env.GA4_PRIVATE_KEY = "-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----";
    process.env.GA4_PROPERTY_ID = "123456789";
    const { isGA4Configured } = await importClient();
    expect(isGA4Configured()).toBe(true);
  });

  it("returns false when client email is not set", async () => {
    delete process.env.GA4_CLIENT_EMAIL;
    process.env.GA4_PRIVATE_KEY = "key";
    process.env.GA4_PROPERTY_ID = "123456789";
    const { isGA4Configured } = await importClient();
    expect(isGA4Configured()).toBe(false);
  });

  it("returns false when private key is not set", async () => {
    process.env.GA4_CLIENT_EMAIL = "test@project.iam.gserviceaccount.com";
    delete process.env.GA4_PRIVATE_KEY;
    process.env.GA4_PROPERTY_ID = "123456789";
    const { isGA4Configured } = await importClient();
    expect(isGA4Configured()).toBe(false);
  });

  it("returns false when property ID is not set", async () => {
    process.env.GA4_CLIENT_EMAIL = "test@project.iam.gserviceaccount.com";
    process.env.GA4_PRIVATE_KEY = "key";
    delete process.env.GA4_PROPERTY_ID;
    const { isGA4Configured } = await importClient();
    expect(isGA4Configured()).toBe(false);
  });
});

describe("GA4 API functions", () => {
  beforeEach(() => {
    process.env.GA4_CLIENT_EMAIL = "test@project.iam.gserviceaccount.com";
    process.env.GA4_PRIVATE_KEY = "-----BEGIN RSA PRIVATE KEY-----\\ntest\\n-----END RSA PRIVATE KEY-----";
    process.env.GA4_PROPERTY_ID = "123456789";
  });

  describe("getRealtimeUsers", () => {
    it("returns current active user count", async () => {
      mockRunRealtimeReport.mockResolvedValueOnce([{
        rows: [{ metricValues: [{ value: "42" }] }],
      }]);

      const { getRealtimeUsers } = await importClient();
      const result = await getRealtimeUsers();
      expect(result).toBe(42);
    });

    it("returns 0 when no rows", async () => {
      mockRunRealtimeReport.mockResolvedValueOnce([{ rows: [] }]);

      const { getRealtimeUsers } = await importClient();
      const result = await getRealtimeUsers();
      expect(result).toBe(0);
    });
  });

  describe("queryAggregate", () => {
    it("returns aggregate metrics for a date range", async () => {
      mockRunReport.mockResolvedValueOnce([{
        rows: [{
          metricValues: [
            { value: "1200" },
            { value: "3400" },
            { value: "1800" },
            { value: "0.452" },
            { value: "120.5" },
            { value: "1.9" },
          ],
        }],
      }]);

      const { queryAggregate } = await importClient();
      const result = await queryAggregate("30d");

      expect(result).toEqual({
        activeUsers: 1200,
        screenPageViews: 3400,
        sessions: 1800,
        bounceRate: 0.452,
        averageSessionDuration: 120.5,
        sessionsPerUser: 1.9,
      });
    });

    it("uses correct date range for 7d", async () => {
      mockRunReport.mockResolvedValueOnce([{
        rows: [{
          metricValues: [
            { value: "100" }, { value: "200" }, { value: "150" },
            { value: "0.3" }, { value: "90" }, { value: "1.3" },
          ],
        }],
      }]);

      const { queryAggregate } = await importClient();
      await queryAggregate("7d");

      const callArgs = mockRunReport.mock.calls[0][0];
      expect(callArgs.dateRanges[0]).toEqual({
        startDate: "7daysAgo",
        endDate: "today",
      });
    });

    it("applies custom date range", async () => {
      mockRunReport.mockResolvedValueOnce([{
        rows: [{
          metricValues: [
            { value: "500" }, { value: "1000" }, { value: "700" },
            { value: "0.4" }, { value: "100" }, { value: "1.4" },
          ],
        }],
      }]);

      const { queryAggregate } = await importClient();
      await queryAggregate("custom", {}, "2026-01-01", "2026-01-31");

      const callArgs = mockRunReport.mock.calls[0][0];
      expect(callArgs.dateRanges[0]).toEqual({
        startDate: "2026-01-01",
        endDate: "2026-01-31",
      });
    });

    it("applies page filter", async () => {
      mockRunReport.mockResolvedValueOnce([{
        rows: [{
          metricValues: [
            { value: "100" }, { value: "200" }, { value: "150" },
            { value: "0.3" }, { value: "90" }, { value: "1.3" },
          ],
        }],
      }]);

      const { queryAggregate } = await importClient();
      await queryAggregate("7d", { page: "/blog" });

      const callArgs = mockRunReport.mock.calls[0][0];
      expect(callArgs.dimensionFilter).toBeDefined();
    });
  });

  describe("queryTimeseries", () => {
    it("returns time series data", async () => {
      mockRunReport.mockResolvedValueOnce([{
        rows: [
          { dimensionValues: [{ value: "20260201" }], metricValues: [{ value: "100" }, { value: "250" }] },
          { dimensionValues: [{ value: "20260202" }], metricValues: [{ value: "120" }, { value: "300" }] },
        ],
      }]);

      const { queryTimeseries } = await importClient();
      const result = await queryTimeseries("7d", "day");

      expect(result).toEqual([
        { date: "2026-02-01", activeUsers: 100, screenPageViews: 250 },
        { date: "2026-02-02", activeUsers: 120, screenPageViews: 300 },
      ]);
    });

    it("uses date dimension for daily period", async () => {
      mockRunReport.mockResolvedValueOnce([{ rows: [] }]);

      const { queryTimeseries } = await importClient();
      await queryTimeseries("30d", "day");

      const callArgs = mockRunReport.mock.calls[0][0];
      expect(callArgs.dimensions[0].name).toBe("date");
    });

    it("uses month dimension for monthly period", async () => {
      mockRunReport.mockResolvedValueOnce([{ rows: [] }]);

      const { queryTimeseries } = await importClient();
      await queryTimeseries("12mo", "month");

      const callArgs = mockRunReport.mock.calls[0][0];
      expect(callArgs.dimensions[0].name).toBe("month");
    });
  });

  describe("queryBreakdown", () => {
    it("returns breakdown by source", async () => {
      mockRunReport.mockResolvedValueOnce([{
        rows: [
          { dimensionValues: [{ value: "google" }], metricValues: [{ value: "500" }, { value: "1200" }] },
          { dimensionValues: [{ value: "facebook" }], metricValues: [{ value: "300" }, { value: "600" }] },
        ],
      }]);

      const { queryBreakdown } = await importClient();
      const result = await queryBreakdown("source", "7d");

      expect(result).toEqual([
        { dimension: "google", activeUsers: 500, screenPageViews: 1200 },
        { dimension: "facebook", activeUsers: 300, screenPageViews: 600 },
      ]);
    });

    it("maps dimension short name to GA4 API name", async () => {
      mockRunReport.mockResolvedValueOnce([{ rows: [] }]);

      const { queryBreakdown } = await importClient();
      await queryBreakdown("source", "7d");

      const callArgs = mockRunReport.mock.calls[0][0];
      expect(callArgs.dimensions[0].name).toBe("sessionSource");
    });

    it("maps country dimension", async () => {
      mockRunReport.mockResolvedValueOnce([{ rows: [] }]);

      const { queryBreakdown } = await importClient();
      await queryBreakdown("country", "30d");

      const callArgs = mockRunReport.mock.calls[0][0];
      expect(callArgs.dimensions[0].name).toBe("country");
    });

    it("respects limit parameter", async () => {
      mockRunReport.mockResolvedValueOnce([{ rows: [] }]);

      const { queryBreakdown } = await importClient();
      await queryBreakdown("page", "30d", {}, 5);

      const callArgs = mockRunReport.mock.calls[0][0];
      expect(callArgs.limit).toBe(5);
    });

    it("applies source filter on breakdown", async () => {
      mockRunReport.mockResolvedValueOnce([{ rows: [] }]);

      const { queryBreakdown } = await importClient();
      await queryBreakdown("page", "7d", { source: "google" });

      const callArgs = mockRunReport.mock.calls[0][0];
      expect(callArgs.dimensionFilter).toBeDefined();
    });
  });
});
