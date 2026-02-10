import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/integrations/meta-ads", () => ({
  isMetaAdsConfigured: vi.fn(),
  parseAccounts: vi.fn(),
  queryOverview: vi.fn(),
  queryCampaigns: vi.fn(),
  queryTimeseries: vi.fn(),
  queryBreakdown: vi.fn(),
}));

import {
  isMetaAdsConfigured,
  parseAccounts,
  queryOverview,
  queryCampaigns,
  queryTimeseries,
  queryBreakdown,
} from "@/lib/integrations/meta-ads";
import { createMetaAdsTools } from "./meta-ads-tools";

const mockIsConfigured = isMetaAdsConfigured as ReturnType<typeof vi.fn>;
const mockParseAccounts = parseAccounts as ReturnType<typeof vi.fn>;
const mockOverview = queryOverview as ReturnType<typeof vi.fn>;
const mockCampaigns = queryCampaigns as ReturnType<typeof vi.fn>;
const mockTimeseries = queryTimeseries as ReturnType<typeof vi.fn>;
const mockBreakdown = queryBreakdown as ReturnType<typeof vi.fn>;

const execOpts = { messages: [], toolCallId: "test", abortSignal: undefined as never };

describe("createMetaAdsTools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns not configured when Meta Ads is not set up", async () => {
    mockIsConfigured.mockReturnValue(false);
    const tools = createMetaAdsTools();
    const result = await tools.metaAdsQuery.execute(
      { action: "overview" as const },
      execOpts
    );
    expect(result).toMatchObject({
      success: false,
      needsConnection: true,
      service: "meta_ads",
    });
  });

  it("lists available accounts", async () => {
    mockIsConfigured.mockReturnValue(true);
    mockParseAccounts.mockReturnValue([
      { name: "增長組", accountId: "act_111" },
      { name: "語言學習", accountId: "act_222" },
    ]);

    const tools = createMetaAdsTools();
    const result = await tools.metaAdsQuery.execute(
      { action: "listAccounts" as const },
      execOpts
    );

    expect(result).toMatchObject({ success: true, service: "meta_ads" });
    const data = (result as { data: unknown }).data;
    expect(data).toHaveLength(2);
    expect((data as Array<{ name: string }>)[0].name).toBe("增長組");
  });

  it("returns overview data with accountId", async () => {
    mockIsConfigured.mockReturnValue(true);
    mockOverview.mockResolvedValue({
      spend: 150, impressions: 5000, clicks: 200, ctr: 4.0,
      cpc: 0.75, cpm: 30, reach: 4000, frequency: 1.25,
      actions: [{ action_type: "purchase", value: "5" }],
      costPerAction: [],
    });

    const tools = createMetaAdsTools();
    const result = await tools.metaAdsQuery.execute(
      { action: "overview" as const, dateRange: "last_7d", accountId: "act_123" },
      execOpts
    );

    expect(result).toMatchObject({ success: true, service: "meta_ads" });
    expect((result as { data: unknown }).data).toMatchObject({ spend: 150 });
    expect(mockOverview).toHaveBeenCalledWith("last_7d", "act_123", undefined, undefined);
  });

  it("defaults overview dateRange to last_30d", async () => {
    mockIsConfigured.mockReturnValue(true);
    mockOverview.mockResolvedValue({
      spend: 0, impressions: 0, clicks: 0, ctr: 0,
      cpc: 0, cpm: 0, reach: 0, frequency: 0, actions: [], costPerAction: [],
    });

    const tools = createMetaAdsTools();
    await tools.metaAdsQuery.execute(
      { action: "overview" as const },
      execOpts
    );

    expect(mockOverview).toHaveBeenCalledWith("last_14d", undefined, undefined, undefined);
  });

  it("returns campaigns data with accountId", async () => {
    mockIsConfigured.mockReturnValue(true);
    mockCampaigns.mockResolvedValue([
      { campaignName: "Test", campaignId: "111", spend: 50, impressions: 2000, clicks: 80, ctr: 4.0, cpc: 0.63, cpm: 25, actions: [], costPerAction: [] },
    ]);

    const tools = createMetaAdsTools();
    const result = await tools.metaAdsQuery.execute(
      { action: "campaigns" as const, dateRange: "last_14d", accountId: "act_123", limit: 5 },
      execOpts
    );

    expect(result).toMatchObject({ success: true, service: "meta_ads" });
    expect(mockCampaigns).toHaveBeenCalledWith("last_14d", "act_123", 5, undefined, undefined, undefined);
  });

  it("passes campaignNameFilter to queryCampaigns", async () => {
    mockIsConfigured.mockReturnValue(true);
    mockCampaigns.mockResolvedValue([
      { campaignName: "ASC_CV_28_超級數字力", campaignId: "333", spend: 100, impressions: 5000, clicks: 200, ctr: 4.0, cpc: 0.5, cpm: 20, actions: [], costPerAction: [] },
    ]);

    const tools = createMetaAdsTools();
    const result = await tools.metaAdsQuery.execute(
      { action: "campaigns" as const, dateRange: "this_month", accountId: "act_123", campaignNameFilter: "28" },
      execOpts
    );

    expect(result).toMatchObject({ success: true, service: "meta_ads" });
    expect(mockCampaigns).toHaveBeenCalledWith("this_month", "act_123", 25, undefined, undefined, "28");
  });

  it("returns timeseries data with accountId", async () => {
    mockIsConfigured.mockReturnValue(true);
    mockTimeseries.mockResolvedValue([
      { date: "2026-02-01", spend: 20, impressions: 800, clicks: 30 },
    ]);

    const tools = createMetaAdsTools();
    const result = await tools.metaAdsQuery.execute(
      { action: "timeseries" as const, dateRange: "last_7d", accountId: "act_123", period: "day" },
      execOpts
    );

    expect(result).toMatchObject({ success: true, service: "meta_ads" });
    expect(mockTimeseries).toHaveBeenCalledWith("last_7d", "act_123", "day", undefined, undefined);
  });

  it("defaults timeseries period to day", async () => {
    mockIsConfigured.mockReturnValue(true);
    mockTimeseries.mockResolvedValue([]);

    const tools = createMetaAdsTools();
    await tools.metaAdsQuery.execute(
      { action: "timeseries" as const, dateRange: "last_7d" },
      execOpts
    );

    expect(mockTimeseries).toHaveBeenCalledWith("last_7d", undefined, "day", undefined, undefined);
  });

  it("returns breakdown data with accountId", async () => {
    mockIsConfigured.mockReturnValue(true);
    mockBreakdown.mockResolvedValue([
      { dimension: "25-34", spend: 60, impressions: 2000, clicks: 80, ctr: 4.0 },
    ]);

    const tools = createMetaAdsTools();
    const result = await tools.metaAdsQuery.execute(
      { action: "breakdown" as const, dimension: "age", dateRange: "last_7d", accountId: "act_123" },
      execOpts
    );

    expect(result).toMatchObject({ success: true, service: "meta_ads" });
    expect(mockBreakdown).toHaveBeenCalledWith("age", "last_7d", "act_123", undefined, undefined);
  });

  it("defaults breakdown dimension to age", async () => {
    mockIsConfigured.mockReturnValue(true);
    mockBreakdown.mockResolvedValue([]);

    const tools = createMetaAdsTools();
    await tools.metaAdsQuery.execute(
      { action: "breakdown" as const, dateRange: "last_7d" },
      execOpts
    );

    expect(mockBreakdown).toHaveBeenCalledWith("age", "last_7d", undefined, undefined, undefined);
  });

  it("handles errors gracefully", async () => {
    mockIsConfigured.mockReturnValue(true);
    mockOverview.mockRejectedValue(new Error("API failure"));

    const tools = createMetaAdsTools();
    const result = await tools.metaAdsQuery.execute(
      { action: "overview" as const },
      execOpts
    );

    expect(result).toMatchObject({
      success: false,
      error: "API failure",
      service: "meta_ads",
    });
  });
});
