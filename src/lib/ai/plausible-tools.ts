import { tool } from "ai";
import { z } from "zod";
import {
  isPlausibleConfigured,
  getRealtimeVisitors,
  queryAggregate,
  queryTimeseries,
  queryBreakdown,
  type PlausibleFilters,
} from "@/lib/integrations/plausible";

export function createPlausibleTools() {
  return {
    plausibleQuery: tool({
      description: `Query Plausible Analytics data (read-only). Actions:
- realtime: current visitors on the site
- aggregate: summary metrics for a date range (visitors, pageviews, visits, bounceRate, visitDuration, viewsPerVisit)
- timeseries: metrics over time (daily/weekly/monthly)
- breakdown: metrics grouped by a dimension (source, page, country, device, utm_source, etc.)`,
      inputSchema: z.object({
        action: z.enum(["realtime", "aggregate", "timeseries", "breakdown"])
          .describe("realtime: current visitors, aggregate: summary metrics, timeseries: trends over time, breakdown: grouped by dimension"),
        dateRange: z.string().optional()
          .describe("Date range: day, 7d, 30d, month, 6mo, 12mo, year, custom. Required for aggregate/timeseries/breakdown."),
        period: z.string().optional()
          .describe("Time granularity for timeseries: day, week, month. Default: day"),
        dimension: z.string().optional()
          .describe("Breakdown dimension: source, page, entry_page, exit_page, country, device, browser, os, utm_source, utm_medium, utm_campaign, utm_content, utm_term"),
        page: z.string().optional().describe("Filter by page path (contains match)"),
        source: z.string().optional().describe("Filter by traffic source"),
        country: z.string().optional().describe("Filter by country name"),
        device: z.string().optional().describe("Filter by device type"),
        utm_source: z.string().optional().describe("Filter by UTM source"),
        utm_medium: z.string().optional().describe("Filter by UTM medium"),
        utm_campaign: z.string().optional().describe("Filter by UTM campaign"),
        startDate: z.string().optional().describe("Start date for custom range (YYYY-MM-DD)"),
        endDate: z.string().optional().describe("End date for custom range (YYYY-MM-DD)"),
        limit: z.number().optional().describe("Max results for breakdown (default 10)"),
      }),
      execute: async (params) => {
        try {
          if (!isPlausibleConfigured()) {
            return {
              success: false,
              error: "Plausible Analytics is not configured.",
              needsConnection: true,
              service: "plausible",
            };
          }

          const filters: PlausibleFilters = {};
          if (params.page) filters.page = params.page;
          if (params.source) filters.source = params.source;
          if (params.country) filters.country = params.country;
          if (params.device) filters.device = params.device;
          if (params.utm_source) filters.utm_source = params.utm_source;
          if (params.utm_medium) filters.utm_medium = params.utm_medium;
          if (params.utm_campaign) filters.utm_campaign = params.utm_campaign;

          switch (params.action) {
            case "realtime": {
              const visitors = await getRealtimeVisitors();
              return {
                success: true,
                service: "plausible",
                data: { visitors },
              };
            }

            case "aggregate": {
              const data = await queryAggregate(
                params.dateRange || "30d",
                filters,
                params.startDate,
                params.endDate
              );
              return {
                success: true,
                service: "plausible",
                data,
                hint: "Use timeseries to see trends over time, or breakdown to see top sources/pages.",
              };
            }

            case "timeseries": {
              const data = await queryTimeseries(
                params.dateRange || "30d",
                params.period || "day",
                filters,
                params.startDate,
                params.endDate
              );
              return {
                success: true,
                service: "plausible",
                data,
                rowCount: data.length,
                hint: "Use breakdown to see top sources, pages, or countries.",
              };
            }

            case "breakdown": {
              const data = await queryBreakdown(
                params.dimension || "source",
                params.dateRange || "30d",
                filters,
                params.limit || 10,
                params.startDate,
                params.endDate
              );
              return {
                success: true,
                service: "plausible",
                data,
                rowCount: data.length,
                hint: "Use aggregate for overall metrics, or add filters to drill down.",
              };
            }
          }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            service: "plausible",
          };
        }
      },
    }),
  };
}
