import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function setEnv(vars: Record<string, string>) {
  process.env.META_ADS_ACCESS_TOKEN = vars.META_ADS_ACCESS_TOKEN || "";
  process.env.META_ADS_ACCOUNT_IDS = vars.META_ADS_ACCOUNT_IDS || "";
}

function clearEnv() {
  delete process.env.META_ADS_ACCESS_TOKEN;
  delete process.env.META_ADS_ACCOUNT_IDS;
}

async function importClient() {
  const mod = await import("./client");
  return mod;
}

describe("isMetaAdsConfigured", () => {
  beforeEach(() => {
    clearEnv();
    vi.resetModules();
    mockFetch.mockReset();
  });

  it("returns true when both env vars are set", async () => {
    setEnv({ META_ADS_ACCESS_TOKEN: "token123", META_ADS_ACCOUNT_IDS: "Test:act_123" });
    const { isMetaAdsConfigured } = await importClient();
    expect(isMetaAdsConfigured()).toBe(true);
  });

  it("returns false when access token is missing", async () => {
    setEnv({ META_ADS_ACCESS_TOKEN: "", META_ADS_ACCOUNT_IDS: "Test:act_123" });
    const { isMetaAdsConfigured } = await importClient();
    expect(isMetaAdsConfigured()).toBe(false);
  });

  it("returns false when account IDs is missing", async () => {
    setEnv({ META_ADS_ACCESS_TOKEN: "token123", META_ADS_ACCOUNT_IDS: "" });
    const { isMetaAdsConfigured } = await importClient();
    expect(isMetaAdsConfigured()).toBe(false);
  });
});

describe("parseAccounts", () => {
  beforeEach(() => {
    clearEnv();
    vi.resetModules();
    mockFetch.mockReset();
  });

  it("parses name:id format", async () => {
    setEnv({ META_ADS_ACCESS_TOKEN: "t", META_ADS_ACCOUNT_IDS: "增長組:act_111,語言學習:act_222" });
    const { parseAccounts } = await importClient();
    const accounts = parseAccounts();
    expect(accounts).toEqual([
      { name: "增長組", accountId: "act_111" },
      { name: "語言學習", accountId: "act_222" },
    ]);
  });

  it("handles bare act_id without name", async () => {
    setEnv({ META_ADS_ACCESS_TOKEN: "t", META_ADS_ACCOUNT_IDS: "act_111,act_222" });
    const { parseAccounts } = await importClient();
    const accounts = parseAccounts();
    expect(accounts).toEqual([
      { name: "act_111", accountId: "act_111" },
      { name: "act_222", accountId: "act_222" },
    ]);
  });

  it("trims whitespace", async () => {
    setEnv({ META_ADS_ACCESS_TOKEN: "t", META_ADS_ACCOUNT_IDS: " 增長組 : act_111 , 語言 : act_222 " });
    const { parseAccounts } = await importClient();
    const accounts = parseAccounts();
    expect(accounts).toEqual([
      { name: "增長組", accountId: "act_111" },
      { name: "語言", accountId: "act_222" },
    ]);
  });

  it("returns empty array when not configured", async () => {
    setEnv({ META_ADS_ACCESS_TOKEN: "t", META_ADS_ACCOUNT_IDS: "" });
    const { parseAccounts } = await importClient();
    expect(parseAccounts()).toEqual([]);
  });
});

describe("queryOverview", () => {
  beforeEach(() => {
    clearEnv();
    vi.resetModules();
    mockFetch.mockReset();
    setEnv({ META_ADS_ACCESS_TOKEN: "token123", META_ADS_ACCOUNT_IDS: "增長組:act_123,語言:act_456" });
  });

  it("fetches account overview for specified accountId", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{
          spend: "150.50",
          impressions: "5000",
          clicks: "200",
          ctr: "4.0",
          cpc: "0.75",
          cpm: "30.10",
          reach: "4000",
          frequency: "1.25",
          actions: [
            { action_type: "link_click", value: "180" },
            { action_type: "purchase", value: "5" },
          ],
          cost_per_action_type: [
            { action_type: "link_click", value: "0.84" },
            { action_type: "purchase", value: "30.10" },
          ],
        }],
      }),
    });

    const { queryOverview } = await importClient();
    const result = await queryOverview("last_7d", "act_123");

    expect(result.spend).toBe(150.50);
    expect(result.impressions).toBe(5000);
    expect(result.clicks).toBe(200);
    expect(result.actions).toHaveLength(2);
    expect(result.actions[0]).toEqual({ action_type: "link_click", value: "180" });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("act_123/insights");
    expect(calledUrl).toContain("access_token=token123");
  });

  it("uses first account when accountId not specified", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{
          spend: "100", impressions: "3000", clicks: "100",
          ctr: "3.3", cpc: "1.0", cpm: "33.3",
          reach: "2500", frequency: "1.2",
          actions: [], cost_per_action_type: [],
        }],
      }),
    });

    const { queryOverview } = await importClient();
    await queryOverview("last_7d");

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("act_123/insights");
  });

  it("uses custom date range", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{
          spend: "100", impressions: "3000", clicks: "100",
          ctr: "3.3", cpc: "1.0", cpm: "33.3",
          reach: "2500", frequency: "1.2",
          actions: [], cost_per_action_type: [],
        }],
      }),
    });

    const { queryOverview } = await importClient();
    await queryOverview("custom", undefined, "2026-01-01", "2026-01-31");

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("2026-01-01");
    expect(calledUrl).toContain("2026-01-31");
  });

  it("throws on API error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({ error: { message: "Invalid token" } }),
    });

    const { queryOverview } = await importClient();
    await expect(queryOverview("last_7d", "act_123")).rejects.toThrow("Meta Ads API error");
  });

  it("handles empty data response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    const { queryOverview } = await importClient();
    const result = await queryOverview("last_7d", "act_123");

    expect(result.spend).toBe(0);
    expect(result.impressions).toBe(0);
    expect(result.actions).toEqual([]);
  });
});

describe("queryCampaigns", () => {
  beforeEach(() => {
    clearEnv();
    vi.resetModules();
    mockFetch.mockReset();
    setEnv({ META_ADS_ACCESS_TOKEN: "token123", META_ADS_ACCOUNT_IDS: "增長組:act_123" });
  });

  it("fetches campaign-level data", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            campaign_name: "Summer Sale",
            campaign_id: "111",
            spend: "80.00",
            impressions: "3000",
            clicks: "120",
            ctr: "4.0",
            cpc: "0.67",
            cpm: "26.67",
            actions: [{ action_type: "purchase", value: "3" }],
            cost_per_action_type: [{ action_type: "purchase", value: "26.67" }],
          },
          {
            campaign_name: "Brand Awareness",
            campaign_id: "222",
            spend: "50.00",
            impressions: "2000",
            clicks: "80",
            ctr: "4.0",
            cpc: "0.63",
            cpm: "25.00",
            actions: [],
            cost_per_action_type: [],
          },
        ],
      }),
    });

    const { queryCampaigns } = await importClient();
    const result = await queryCampaigns("last_30d", "act_123");

    expect(result).toHaveLength(2);
    expect(result[0].campaignName).toBe("Summer Sale");
    expect(result[0].campaignId).toBe("111");
    expect(result[0].spend).toBe(80.0);
    expect(result[0].actions).toHaveLength(1);

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("level=campaign");
    expect(calledUrl).toContain("act_123/insights");
  });

  it("respects limit parameter", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    const { queryCampaigns } = await importClient();
    await queryCampaigns("last_7d", "act_123", 5);

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("limit=5");
  });
});

describe("queryTimeseries", () => {
  beforeEach(() => {
    clearEnv();
    vi.resetModules();
    mockFetch.mockReset();
    setEnv({ META_ADS_ACCESS_TOKEN: "token123", META_ADS_ACCOUNT_IDS: "增長組:act_123" });
  });

  it("fetches daily timeseries", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { date_start: "2026-02-01", spend: "20.00", impressions: "800", clicks: "30" },
          { date_start: "2026-02-02", spend: "25.00", impressions: "900", clicks: "35" },
        ],
      }),
    });

    const { queryTimeseries } = await importClient();
    const result = await queryTimeseries("last_7d", "act_123");

    expect(result).toHaveLength(2);
    expect(result[0].date).toBe("2026-02-01");
    expect(result[0].spend).toBe(20.0);
    expect(result[0].impressions).toBe(800);
    expect(result[0].clicks).toBe(30);

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("time_increment=1");
  });

  it("defaults to daily period", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    const { queryTimeseries } = await importClient();
    await queryTimeseries("last_7d", "act_123");

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("time_increment=1");
  });
});

describe("queryBreakdown", () => {
  beforeEach(() => {
    clearEnv();
    vi.resetModules();
    mockFetch.mockReset();
    setEnv({ META_ADS_ACCESS_TOKEN: "token123", META_ADS_ACCOUNT_IDS: "增長組:act_123" });
  });

  it("fetches breakdown by age", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { age: "25-34", spend: "60.00", impressions: "2000", clicks: "80", ctr: "4.0" },
          { age: "35-44", spend: "40.00", impressions: "1500", clicks: "50", ctr: "3.3" },
        ],
      }),
    });

    const { queryBreakdown } = await importClient();
    const result = await queryBreakdown("age", "last_7d", "act_123");

    expect(result).toHaveLength(2);
    expect(result[0].dimension).toBe("25-34");
    expect(result[0].spend).toBe(60.0);

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("breakdowns=age");
    expect(calledUrl).toContain("act_123/insights");
  });

  it("maps platform dimension correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { publisher_platform: "facebook", spend: "70.00", impressions: "3000", clicks: "100", ctr: "3.3" },
        ],
      }),
    });

    const { queryBreakdown } = await importClient();
    const result = await queryBreakdown("platform", "last_7d", "act_123");

    expect(result[0].dimension).toBe("facebook");

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("breakdowns=publisher_platform");
  });

  it("maps device dimension correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { device_platform: "mobile", spend: "50.00", impressions: "2000", clicks: "80", ctr: "4.0" },
        ],
      }),
    });

    const { queryBreakdown } = await importClient();
    const result = await queryBreakdown("device", "last_7d", "act_123");

    expect(result[0].dimension).toBe("mobile");

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("breakdowns=device_platform");
  });
});
