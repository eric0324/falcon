import { tool } from "ai";
import { z } from "zod";
import {
  isGA4Configured,
  getRealtimeUsers,
  queryAggregate,
  queryTimeseries,
  queryBreakdown,
  type GA4Filters,
} from "@/lib/integrations/ga4";

export function createGA4Tools() {
  return {
    ga4Query: tool({
      description: `Query Google Analytics 4 data (read-only). Actions:
- realtime: active users in the last 30 minutes
- aggregate: summary metrics for a date range (activeUsers, screenPageViews, sessions, bounceRate, averageSessionDuration, sessionsPerUser)
- timeseries: metrics over time (daily/monthly)
- breakdown: metrics grouped by a dimension (source, page, country, device, browser, os, event, etc.)`,
      inputSchema: z.object({
        action: z.enum(["realtime", "aggregate", "timeseries", "breakdown"])
          .describe("realtime: active users now, aggregate: summary metrics, timeseries: trends over time, breakdown: grouped by dimension"),
        dateRange: z.string().optional()
          .describe("Date range: today, yesterday, 7d, 30d, 90d, 12mo, custom. Required for aggregate/timeseries/breakdown."),
        period: z.string().optional()
          .describe("Time granularity for timeseries: day, month. Default: day"),
        dimension: z.string().optional()
          .describe("Breakdown dimension: source, medium, channel, page, landing_page, country, city, device, browser, os, event"),
        page: z.string().optional().describe("Filter by page path (contains match)"),
        source: z.string().optional().describe("Filter by traffic source"),
        country: z.string().optional().describe("Filter by country"),
        device: z.string().optional().describe("Filter by device category"),
        event: z.string().optional().describe("Filter by event name"),
        startDate: z.string().optional().describe("Start date for custom range (YYYY-MM-DD)"),
        endDate: z.string().optional().describe("End date for custom range (YYYY-MM-DD)"),
        limit: z.number().optional().describe("Max results for breakdown (default 10)"),
      }),
      execute: async (params) => {
        try {
          if (!isGA4Configured()) {
            return {
              success: false,
              error: "Google Analytics 4 is not configured.",
              needsConnection: true,
              service: "ga4",
            };
          }

          const filters: GA4Filters = {};
          if (params.page) filters.page = params.page;
          if (params.source) filters.source = params.source;
          if (params.country) filters.country = params.country;
          if (params.device) filters.device = params.device;
          if (params.event) filters.event = params.event;

          switch (params.action) {
            case "realtime": {
              const activeUsers = await getRealtimeUsers();
              return {
                success: true,
                service: "ga4",
                data: { activeUsers },
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
                service: "ga4",
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
                service: "ga4",
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
                service: "ga4",
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
            service: "ga4",
          };
        }
      },
    }),
  };
}
