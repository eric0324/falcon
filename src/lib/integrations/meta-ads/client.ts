const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = "https://graph.facebook.com";

// ===== Types =====

export interface MetaAdsAction {
  action_type: string;
  value: string;
}

export interface MetaAdsAccount {
  name: string;
  accountId: string;
}

export interface MetaAdsMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  reach: number;
  frequency: number;
  actions: MetaAdsAction[];
  costPerAction: MetaAdsAction[];
}

export interface MetaAdsCampaignEntry {
  campaignName: string;
  campaignId: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  actions: MetaAdsAction[];
  costPerAction: MetaAdsAction[];
}

export interface MetaAdsTimeseriesEntry {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
}

export interface MetaAdsBreakdownEntry {
  dimension: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
}

// ===== Configuration =====

export function isMetaAdsConfigured(): boolean {
  return (
    !!process.env.META_ADS_ACCESS_TOKEN &&
    !!process.env.META_ADS_ACCOUNT_IDS
  );
}

export function parseAccounts(): MetaAdsAccount[] {
  const raw = process.env.META_ADS_ACCOUNT_IDS;
  if (!raw) return [];

  return raw.split(",").map((entry) => {
    const trimmed = entry.trim();
    if (!trimmed) return null;

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) {
      return { name: trimmed, accountId: trimmed };
    }

    const name = trimmed.slice(0, colonIdx).trim();
    const accountId = trimmed.slice(colonIdx + 1).trim();
    return { name, accountId };
  }).filter(Boolean) as MetaAdsAccount[];
}

function getAccessToken(): string {
  const token = process.env.META_ADS_ACCESS_TOKEN;
  if (!token) throw new Error("META_ADS_ACCESS_TOKEN is not configured");
  return token;
}

function resolveAccountId(accountId?: string): string {
  if (accountId) return accountId;
  const accounts = parseAccounts();
  if (accounts.length === 0) throw new Error("META_ADS_ACCOUNT_IDS is not configured");
  return accounts[0].accountId;
}

// ===== Date Range =====

function buildTimeRange(
  dateRange: string,
  startDate?: string,
  endDate?: string
): { since: string; until: string } {
  if (dateRange === "custom" && startDate && endDate) {
    return { since: startDate, until: endDate };
  }

  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const today = fmt(now);
  const yesterday = fmt(new Date(now.getTime() - 86400000));

  const daysAgo = (n: number) => fmt(new Date(now.getTime() - n * 86400000));

  const mapping: Record<string, { since: string; until: string }> = {
    today: { since: today, until: today },
    yesterday: { since: yesterday, until: yesterday },
    last_7d: { since: daysAgo(7), until: yesterday },
    last_14d: { since: daysAgo(14), until: yesterday },
    last_30d: { since: daysAgo(30), until: yesterday },
    this_month: {
      since: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
      until: today,
    },
    last_month: (() => {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      return { since: fmt(lastMonth), until: fmt(lastDay) };
    })(),
  };

  return mapping[dateRange] || mapping["last_30d"];
}

// ===== Dimension Mapping =====

const BREAKDOWN_MAP: Record<string, string> = {
  age: "age",
  gender: "gender",
  country: "country",
  platform: "publisher_platform",
  device: "device_platform",
  placement: "platform_position",
};

// ===== Core Fields =====

const OVERVIEW_FIELDS = [
  "spend", "impressions", "clicks", "ctr", "cpc", "cpm",
  "reach", "frequency", "actions", "cost_per_action_type",
];

const CAMPAIGN_FIELDS = [
  "campaign_name", "campaign_id",
  "spend", "impressions", "clicks", "ctr", "cpc", "cpm",
  "actions", "cost_per_action_type",
];

const TIMESERIES_FIELDS = ["spend", "impressions", "clicks"];

const BREAKDOWN_FIELDS = ["spend", "impressions", "clicks", "ctr"];

// ===== Helpers =====

function parseNum(val: string | undefined | null): number {
  if (!val) return 0;
  return parseFloat(val) || 0;
}

function parseActions(raw: MetaAdsAction[] | undefined | null): MetaAdsAction[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchInsights(accountId: string, params: Record<string, string>): Promise<any> {
  const token = getAccessToken();

  const searchParams = new URLSearchParams({
    access_token: token,
    ...params,
  });

  const url = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${accountId}/insights?${searchParams}`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = error?.error?.message || response.statusText;
    throw new Error(`Meta Ads API error: ${response.status} ${message}`);
  }

  return response.json();
}

// ===== API Functions =====

export async function queryOverview(
  dateRange: string,
  accountId?: string,
  startDate?: string,
  endDate?: string
): Promise<MetaAdsMetrics> {
  const id = resolveAccountId(accountId);
  const timeRange = buildTimeRange(dateRange, startDate, endDate);

  const data = await fetchInsights(id, {
    fields: OVERVIEW_FIELDS.join(","),
    time_range: JSON.stringify(timeRange),
  });

  const row = data.data?.[0];
  if (!row) {
    return {
      spend: 0, impressions: 0, clicks: 0, ctr: 0, cpc: 0, cpm: 0,
      reach: 0, frequency: 0, actions: [], costPerAction: [],
    };
  }

  return {
    spend: parseNum(row.spend),
    impressions: parseNum(row.impressions),
    clicks: parseNum(row.clicks),
    ctr: parseNum(row.ctr),
    cpc: parseNum(row.cpc),
    cpm: parseNum(row.cpm),
    reach: parseNum(row.reach),
    frequency: parseNum(row.frequency),
    actions: parseActions(row.actions),
    costPerAction: parseActions(row.cost_per_action_type),
  };
}

export async function queryCampaigns(
  dateRange: string,
  accountId?: string,
  limit: number = 25,
  startDate?: string,
  endDate?: string
): Promise<MetaAdsCampaignEntry[]> {
  const id = resolveAccountId(accountId);
  const timeRange = buildTimeRange(dateRange, startDate, endDate);

  const data = await fetchInsights(id, {
    fields: CAMPAIGN_FIELDS.join(","),
    time_range: JSON.stringify(timeRange),
    level: "campaign",
    sort: "spend_descending",
    limit: String(limit),
  });

  return (data.data || []).map((row: Record<string, unknown>) => ({
    campaignName: (row.campaign_name as string) || "",
    campaignId: (row.campaign_id as string) || "",
    spend: parseNum(row.spend as string),
    impressions: parseNum(row.impressions as string),
    clicks: parseNum(row.clicks as string),
    ctr: parseNum(row.ctr as string),
    cpc: parseNum(row.cpc as string),
    cpm: parseNum(row.cpm as string),
    actions: parseActions(row.actions as MetaAdsAction[]),
    costPerAction: parseActions(row.cost_per_action_type as MetaAdsAction[]),
  }));
}

export async function queryTimeseries(
  dateRange: string,
  accountId?: string,
  period: string = "day",
  startDate?: string,
  endDate?: string
): Promise<MetaAdsTimeseriesEntry[]> {
  const id = resolveAccountId(accountId);
  const timeRange = buildTimeRange(dateRange, startDate, endDate);
  const timeIncrement = period === "monthly" ? "monthly" : "1";

  const data = await fetchInsights(id, {
    fields: TIMESERIES_FIELDS.join(","),
    time_range: JSON.stringify(timeRange),
    time_increment: timeIncrement,
  });

  return (data.data || []).map((row: Record<string, unknown>) => ({
    date: (row.date_start as string) || "",
    spend: parseNum(row.spend as string),
    impressions: parseNum(row.impressions as string),
    clicks: parseNum(row.clicks as string),
  }));
}

export async function queryBreakdown(
  dimension: string,
  dateRange: string,
  accountId?: string,
  startDate?: string,
  endDate?: string
): Promise<MetaAdsBreakdownEntry[]> {
  const id = resolveAccountId(accountId);
  const apiBreakdown = BREAKDOWN_MAP[dimension] || dimension;
  const timeRange = buildTimeRange(dateRange, startDate, endDate);

  const data = await fetchInsights(id, {
    fields: BREAKDOWN_FIELDS.join(","),
    time_range: JSON.stringify(timeRange),
    breakdowns: apiBreakdown,
  });

  return (data.data || []).map((row: Record<string, unknown>) => ({
    dimension: (row[apiBreakdown] as string) || "",
    spend: parseNum(row.spend as string),
    impressions: parseNum(row.impressions as string),
    clicks: parseNum(row.clicks as string),
    ctr: parseNum(row.ctr as string),
  }));
}
