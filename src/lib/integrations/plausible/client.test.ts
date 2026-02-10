import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const originalEnv = process.env;

beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

async function importClient() {
  return import("./client");
}

describe("isPlausibleConfigured", () => {
  it("returns true when API key and site ID are set", async () => {
    process.env.PLAUSIBLE_API_KEY = "test-key";
    process.env.PLAUSIBLE_SITE_ID = "example.com";
    const { isPlausibleConfigured } = await importClient();
    expect(isPlausibleConfigured()).toBe(true);
  });

  it("returns false when API key is not set", async () => {
    delete process.env.PLAUSIBLE_API_KEY;
    process.env.PLAUSIBLE_SITE_ID = "example.com";
    const { isPlausibleConfigured } = await importClient();
    expect(isPlausibleConfigured()).toBe(false);
  });

  it("returns false when site ID is not set", async () => {
    process.env.PLAUSIBLE_API_KEY = "test-key";
    delete process.env.PLAUSIBLE_SITE_ID;
    const { isPlausibleConfigured } = await importClient();
    expect(isPlausibleConfigured()).toBe(false);
  });
});

describe("Plausible API functions", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    process.env.PLAUSIBLE_API_KEY = "test-key";
    process.env.PLAUSIBLE_SITE_ID = "example.com";
    global.fetch = mockFetch;
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getRealtimeVisitors", () => {
    it("returns current visitor count from v1 endpoint", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => 42,
      });

      const { getRealtimeVisitors } = await importClient();
      const result = await getRealtimeVisitors();

      expect(result).toBe(42);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/stats/realtime/visitors"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-key",
          }),
        })
      );
    });

    it("uses custom base URL when set", async () => {
      process.env.PLAUSIBLE_BASE_URL = "https://analytics.mysite.com";
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => 10,
      });

      const { getRealtimeVisitors } = await importClient();
      await getRealtimeVisitors();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("https://analytics.mysite.com"),
        expect.anything()
      );
    });
  });

  describe("queryAggregate", () => {
    it("returns aggregate metrics for a date range", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            { metrics: [1200, 3400, 1800, 45.2, 120, 1.9] },
          ],
        }),
      });

      const { queryAggregate } = await importClient();
      const result = await queryAggregate("30d");

      expect(result).toEqual({
        visitors: 1200,
        pageviews: 3400,
        visits: 1800,
        bounceRate: 45.2,
        visitDuration: 120,
        viewsPerVisit: 1.9,
      });

      // Verify it's a POST request with JSON body
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain("/api/v2/query");
      expect(options.method).toBe("POST");
      const body = JSON.parse(options.body);
      expect(body.site_id).toBe("example.com");
      expect(body.date_range).toBe("30d");
      expect(body.metrics).toEqual([
        "visitors", "pageviews", "visits", "bounce_rate", "visit_duration", "views_per_visit",
      ]);
    });

    it("applies page filter when provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{ metrics: [100, 200, 150, 30, 90, 1.3] }],
        }),
      });

      const { queryAggregate } = await importClient();
      await queryAggregate("7d", { page: "/blog" });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.filters).toEqual([["contains", "event:page", ["/blog"]]]);
    });

    it("applies custom date range", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{ metrics: [500, 1000, 700, 40, 100, 1.4] }],
        }),
      });

      const { queryAggregate } = await importClient();
      await queryAggregate("custom", {}, "2026-01-01", "2026-01-31");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.date_range).toEqual(["2026-01-01", "2026-01-31"]);
    });
  });

  describe("queryTimeseries", () => {
    it("returns time series data", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            { dimensions: ["2026-02-01"], metrics: [100, 250] },
            { dimensions: ["2026-02-02"], metrics: [120, 300] },
          ],
        }),
      });

      const { queryTimeseries } = await importClient();
      const result = await queryTimeseries("7d", "day");

      expect(result).toEqual([
        { date: "2026-02-01", visitors: 100, pageviews: 250 },
        { date: "2026-02-02", visitors: 120, pageviews: 300 },
      ]);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.dimensions).toEqual(["time:day"]);
    });
  });

  describe("queryBreakdown", () => {
    it("returns breakdown by source", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            { dimensions: ["Google"], metrics: [500, 1200] },
            { dimensions: ["Facebook"], metrics: [300, 600] },
          ],
        }),
      });

      const { queryBreakdown } = await importClient();
      const result = await queryBreakdown("source", "7d");

      expect(result).toEqual([
        { dimension: "Google", visitors: 500, pageviews: 1200 },
        { dimension: "Facebook", visitors: 300, pageviews: 600 },
      ]);
    });

    it("returns breakdown by country using human-readable names", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            { dimensions: ["Taiwan"], metrics: [800, 2000] },
            { dimensions: ["United States"], metrics: [200, 500] },
          ],
        }),
      });

      const { queryBreakdown } = await importClient();
      const result = await queryBreakdown("country", "30d");

      expect(result[0].dimension).toBe("Taiwan");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.dimensions).toEqual(["visit:country_name"]);
    });

    it("applies source filter on breakdown", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            { dimensions: ["/pricing"], metrics: [50, 80] },
          ],
        }),
      });

      const { queryBreakdown } = await importClient();
      await queryBreakdown("page", "7d", { source: "Google" });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.filters).toEqual([["is", "visit:source", ["Google"]]]);
    });

    it("respects limit parameter", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      });

      const { queryBreakdown } = await importClient();
      await queryBreakdown("page", "30d", {}, 5);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.pagination.limit).toBe(5);
    });
  });
});
