const DEFAULT_BASE_URL = "https://plausible.io";

// ===== Types =====

export interface PlausibleMetrics {
  visitors: number;
  pageviews: number;
  visits: number;
  bounceRate: number;
  visitDuration: number;
  viewsPerVisit: number;
}

export interface PlausibleTimeseriesEntry {
  date: string;
  visitors: number;
  pageviews: number;
}

export interface PlausibleBreakdownEntry {
  dimension: string;
  visitors: number;
  pageviews: number;
}

export interface PlausibleFilters {
  page?: string;
  source?: string;
  country?: string;
  device?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

// ===== Configuration =====

export function isPlausibleConfigured(): boolean {
  return !!process.env.PLAUSIBLE_API_KEY && !!process.env.PLAUSIBLE_SITE_ID;
}

function getBaseUrl(): string {
  return process.env.PLAUSIBLE_BASE_URL || DEFAULT_BASE_URL;
}

function getApiKey(): string {
  const key = process.env.PLAUSIBLE_API_KEY;
  if (!key) throw new Error("PLAUSIBLE_API_KEY is not configured");
  return key;
}

function getSiteId(): string {
  const id = process.env.PLAUSIBLE_SITE_ID;
  if (!id) throw new Error("PLAUSIBLE_SITE_ID is not configured");
  return id;
}

// ===== Filter Builder =====

function buildFilters(filters?: PlausibleFilters): Array<[string, string, string[]]> {
  if (!filters) return [];

  const result: Array<[string, string, string[]]> = [];

  if (filters.page) {
    result.push(["contains", "event:page", [filters.page]]);
  }
  if (filters.source) {
    result.push(["is", "visit:source", [filters.source]]);
  }
  if (filters.country) {
    result.push(["is", "visit:country_name", [filters.country]]);
  }
  if (filters.device) {
    result.push(["is", "visit:device", [filters.device]]);
  }
  if (filters.utm_source) {
    result.push(["is", "visit:utm_source", [filters.utm_source]]);
  }
  if (filters.utm_medium) {
    result.push(["is", "visit:utm_medium", [filters.utm_medium]]);
  }
  if (filters.utm_campaign) {
    result.push(["is", "visit:utm_campaign", [filters.utm_campaign]]);
  }

  return result;
}

// ===== Dimension Mapping =====

const DIMENSION_MAP: Record<string, string> = {
  source: "visit:source",
  page: "event:page",
  entry_page: "visit:entry_page",
  exit_page: "visit:exit_page",
  country: "visit:country_name",
  device: "visit:device",
  browser: "visit:browser",
  os: "visit:os",
  utm_source: "visit:utm_source",
  utm_medium: "visit:utm_medium",
  utm_campaign: "visit:utm_campaign",
  utm_content: "visit:utm_content",
  utm_term: "visit:utm_term",
};

// ===== API Functions =====

export async function getRealtimeVisitors(): Promise<number> {
  const url = `${getBaseUrl()}/api/v1/stats/realtime/visitors?site_id=${getSiteId()}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Plausible API error: ${response.status} ${error.error || response.statusText}`
    );
  }

  return response.json();
}

export async function queryAggregate(
  dateRange: string,
  filters?: PlausibleFilters,
  startDate?: string,
  endDate?: string
): Promise<PlausibleMetrics> {
  const metrics = [
    "visitors", "pageviews", "visits", "bounce_rate", "visit_duration", "views_per_visit",
  ];

  const body: Record<string, unknown> = {
    site_id: getSiteId(),
    metrics,
    date_range: dateRange === "custom" && startDate && endDate
      ? [startDate, endDate]
      : dateRange,
  };

  const builtFilters = buildFilters(filters);
  if (builtFilters.length > 0) {
    body.filters = builtFilters;
  }

  const response = await fetch(`${getBaseUrl()}/api/v2/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Plausible API error: ${response.status} ${error.error || response.statusText}`
    );
  }

  const data = await response.json();
  const m = data.results[0].metrics;

  return {
    visitors: m[0],
    pageviews: m[1],
    visits: m[2],
    bounceRate: m[3],
    visitDuration: m[4],
    viewsPerVisit: m[5],
  };
}

export async function queryTimeseries(
  dateRange: string,
  period: string = "day",
  filters?: PlausibleFilters,
  startDate?: string,
  endDate?: string
): Promise<PlausibleTimeseriesEntry[]> {
  const body: Record<string, unknown> = {
    site_id: getSiteId(),
    metrics: ["visitors", "pageviews"],
    dimensions: [`time:${period}`],
    date_range: dateRange === "custom" && startDate && endDate
      ? [startDate, endDate]
      : dateRange,
  };

  const builtFilters = buildFilters(filters);
  if (builtFilters.length > 0) {
    body.filters = builtFilters;
  }

  const response = await fetch(`${getBaseUrl()}/api/v2/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Plausible API error: ${response.status} ${error.error || response.statusText}`
    );
  }

  const data = await response.json();

  return data.results.map((row: { dimensions: string[]; metrics: number[] }) => ({
    date: row.dimensions[0],
    visitors: row.metrics[0],
    pageviews: row.metrics[1],
  }));
}

export async function queryBreakdown(
  dimension: string,
  dateRange: string,
  filters?: PlausibleFilters,
  limit: number = 10,
  startDate?: string,
  endDate?: string
): Promise<PlausibleBreakdownEntry[]> {
  const plausibleDimension = DIMENSION_MAP[dimension] || dimension;

  const body: Record<string, unknown> = {
    site_id: getSiteId(),
    metrics: ["visitors", "pageviews"],
    dimensions: [plausibleDimension],
    date_range: dateRange === "custom" && startDate && endDate
      ? [startDate, endDate]
      : dateRange,
    order_by: [["visitors", "desc"]],
    pagination: { limit },
  };

  const builtFilters = buildFilters(filters);
  if (builtFilters.length > 0) {
    body.filters = builtFilters;
  }

  const response = await fetch(`${getBaseUrl()}/api/v2/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Plausible API error: ${response.status} ${error.error || response.statusText}`
    );
  }

  const data = await response.json();

  return data.results.map((row: { dimensions: string[]; metrics: number[] }) => ({
    dimension: row.dimensions[0],
    visitors: row.metrics[0],
    pageviews: row.metrics[1],
  }));
}
