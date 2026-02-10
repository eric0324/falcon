import { BetaAnalyticsDataClient } from "@google-analytics/data";

// ===== Types =====

export interface GA4Metrics {
  activeUsers: number;
  screenPageViews: number;
  sessions: number;
  bounceRate: number;
  averageSessionDuration: number;
  sessionsPerUser: number;
}

export interface GA4TimeseriesEntry {
  date: string;
  activeUsers: number;
  screenPageViews: number;
}

export interface GA4BreakdownEntry {
  dimension: string;
  activeUsers: number;
  screenPageViews: number;
}

export interface GA4Filters {
  page?: string;
  source?: string;
  country?: string;
  device?: string;
  event?: string;
}

// ===== Configuration =====

export function isGA4Configured(): boolean {
  return (
    !!process.env.GA4_CLIENT_EMAIL &&
    !!process.env.GA4_PRIVATE_KEY &&
    !!process.env.GA4_PROPERTY_ID
  );
}

let clientInstance: BetaAnalyticsDataClient | null = null;

function getClient(): BetaAnalyticsDataClient {
  if (!clientInstance) {
    const privateKey = (process.env.GA4_PRIVATE_KEY || "").replace(/\\n/g, "\n");
    clientInstance = new BetaAnalyticsDataClient({
      credentials: {
        client_email: process.env.GA4_CLIENT_EMAIL,
        private_key: privateKey,
      },
    });
  }
  return clientInstance;
}

/** Reset cached client (for testing) */
export function _resetClient(): void {
  clientInstance = null;
}

function getPropertyId(): string {
  const id = process.env.GA4_PROPERTY_ID;
  if (!id) throw new Error("GA4_PROPERTY_ID is not configured");
  return id;
}

// ===== Date Range Mapping =====

function buildDateRange(
  dateRange: string,
  startDate?: string,
  endDate?: string
): { startDate: string; endDate: string } {
  if (dateRange === "custom" && startDate && endDate) {
    return { startDate, endDate };
  }

  const mapping: Record<string, { startDate: string; endDate: string }> = {
    today: { startDate: "today", endDate: "today" },
    yesterday: { startDate: "yesterday", endDate: "yesterday" },
    "7d": { startDate: "7daysAgo", endDate: "today" },
    "30d": { startDate: "30daysAgo", endDate: "today" },
    "90d": { startDate: "90daysAgo", endDate: "today" },
    "12mo": { startDate: "365daysAgo", endDate: "today" },
  };

  return mapping[dateRange] || mapping["30d"];
}

// ===== Dimension Mapping =====

const DIMENSION_MAP: Record<string, string> = {
  source: "sessionSource",
  medium: "sessionMedium",
  channel: "defaultChannelGroup",
  page: "pagePath",
  landing_page: "landingPage",
  country: "country",
  city: "city",
  device: "deviceCategory",
  browser: "browser",
  os: "operatingSystem",
  event: "eventName",
};

// ===== Period → Dimension Mapping =====

function getPeriodDimension(period: string): string {
  if (period === "month") return "month";
  return "date";
}

// ===== Filter Builder =====

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildDimensionFilter(filters?: GA4Filters): any {
  if (!filters) return undefined;

  const filterEntries: Array<{ fieldName: string; matchType: string; value: string }> = [];

  if (filters.page) {
    filterEntries.push({ fieldName: "pagePath", matchType: "CONTAINS", value: filters.page });
  }
  if (filters.source) {
    filterEntries.push({ fieldName: "sessionSource", matchType: "EXACT", value: filters.source });
  }
  if (filters.country) {
    filterEntries.push({ fieldName: "country", matchType: "EXACT", value: filters.country });
  }
  if (filters.device) {
    filterEntries.push({ fieldName: "deviceCategory", matchType: "EXACT", value: filters.device });
  }
  if (filters.event) {
    filterEntries.push({ fieldName: "eventName", matchType: "EXACT", value: filters.event });
  }

  if (filterEntries.length === 0) return undefined;

  if (filterEntries.length === 1) {
    const f = filterEntries[0];
    return {
      filter: {
        fieldName: f.fieldName,
        stringFilter: { matchType: f.matchType, value: f.value },
      },
    };
  }

  return {
    andGroup: {
      expressions: filterEntries.map((f) => ({
        filter: {
          fieldName: f.fieldName,
          stringFilter: { matchType: f.matchType, value: f.value },
        },
      })),
    },
  };
}

// ===== Date Formatting =====

function formatGA4Date(raw: string): string {
  // GA4 returns dates as "YYYYMMDD", convert to "YYYY-MM-DD"
  if (raw.length === 8 && /^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  return raw;
}

// ===== API Functions =====

const CORE_METRICS = [
  { name: "activeUsers" },
  { name: "screenPageViews" },
  { name: "sessions" },
  { name: "bounceRate" },
  { name: "averageSessionDuration" },
  { name: "sessionsPerUser" },
];

export async function getRealtimeUsers(): Promise<number> {
  const client = getClient();
  const [response] = await client.runRealtimeReport({
    property: `properties/${getPropertyId()}`,
    metrics: [{ name: "activeUsers" }],
  });

  if (!response.rows || response.rows.length === 0) return 0;
  return parseInt(response.rows[0].metricValues?.[0]?.value || "0", 10);
}

export async function queryAggregate(
  dateRange: string,
  filters?: GA4Filters,
  startDate?: string,
  endDate?: string
): Promise<GA4Metrics> {
  const client = getClient();
  const [response] = await client.runReport({
    property: `properties/${getPropertyId()}`,
    dateRanges: [buildDateRange(dateRange, startDate, endDate)],
    metrics: CORE_METRICS,
    dimensionFilter: buildDimensionFilter(filters),
  });

  const row = response.rows?.[0];
  const m = row?.metricValues || [];

  return {
    activeUsers: parseInt(m[0]?.value || "0", 10),
    screenPageViews: parseInt(m[1]?.value || "0", 10),
    sessions: parseInt(m[2]?.value || "0", 10),
    bounceRate: parseFloat(m[3]?.value || "0"),
    averageSessionDuration: parseFloat(m[4]?.value || "0"),
    sessionsPerUser: parseFloat(m[5]?.value || "0"),
  };
}

export async function queryTimeseries(
  dateRange: string,
  period: string = "day",
  filters?: GA4Filters,
  startDate?: string,
  endDate?: string
): Promise<GA4TimeseriesEntry[]> {
  const client = getClient();
  const [response] = await client.runReport({
    property: `properties/${getPropertyId()}`,
    dateRanges: [buildDateRange(dateRange, startDate, endDate)],
    dimensions: [{ name: getPeriodDimension(period) }],
    metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }],
    dimensionFilter: buildDimensionFilter(filters),
    orderBys: [{ dimension: { dimensionName: getPeriodDimension(period) }, desc: false }],
  });

  return (response.rows || []).map((row) => ({
    date: formatGA4Date(row.dimensionValues?.[0]?.value || ""),
    activeUsers: parseInt(row.metricValues?.[0]?.value || "0", 10),
    screenPageViews: parseInt(row.metricValues?.[1]?.value || "0", 10),
  }));
}

export async function queryBreakdown(
  dimension: string,
  dateRange: string,
  filters?: GA4Filters,
  limit: number = 10,
  startDate?: string,
  endDate?: string
): Promise<GA4BreakdownEntry[]> {
  const ga4Dimension = DIMENSION_MAP[dimension] || dimension;
  const client = getClient();

  const [response] = await client.runReport({
    property: `properties/${getPropertyId()}`,
    dateRanges: [buildDateRange(dateRange, startDate, endDate)],
    dimensions: [{ name: ga4Dimension }],
    metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }],
    dimensionFilter: buildDimensionFilter(filters),
    orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
    limit,
  });

  return (response.rows || []).map((row) => ({
    dimension: row.dimensionValues?.[0]?.value || "",
    activeUsers: parseInt(row.metricValues?.[0]?.value || "0", 10),
    screenPageViews: parseInt(row.metricValues?.[1]?.value || "0", 10),
  }));
}
