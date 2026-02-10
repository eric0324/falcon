import { tool } from "ai";
import { z } from "zod";
import {
  isMetaAdsConfigured,
  parseAccounts,
  queryOverview,
  queryCampaigns,
  queryTimeseries,
  queryBreakdown,
} from "@/lib/integrations/meta-ads";

export function createMetaAdsTools() {
  return {
    metaAdsQuery: tool({
      description: `Query Meta (Facebook/Instagram) Ads performance data (read-only). Actions:
- listAccounts: list all configured ad accounts (name + accountId)
- overview: account-level summary (spend, impressions, clicks, CTR, CPC, CPM, reach, frequency, conversions)
- campaigns: campaign-level performance (sorted by spend)
- timeseries: daily/monthly spend and engagement trends
- breakdown: metrics grouped by dimension (age, gender, country, platform, device, placement)
Use listAccounts first to see available accounts, then pass accountId to other actions.`,
      inputSchema: z.object({
        action: z.enum(["listAccounts", "overview", "campaigns", "timeseries", "breakdown"])
          .describe("listAccounts: see available accounts, overview: account summary, campaigns: per-campaign data, timeseries: trends, breakdown: by dimension"),
        accountId: z.string().optional()
          .describe("Ad account ID (e.g. act_123456). Use listAccounts to find available IDs. If omitted, uses the first account."),
        dateRange: z.string().optional()
          .describe("Date range: today, yesterday, last_7d, last_14d, last_30d, this_month, last_month, custom"),
        period: z.string().optional()
          .describe("Time granularity for timeseries: day, monthly. Default: day"),
        dimension: z.string().optional()
          .describe("Breakdown dimension: age, gender, country, platform, device, placement"),
        startDate: z.string().optional().describe("Start date for custom range (YYYY-MM-DD)"),
        endDate: z.string().optional().describe("End date for custom range (YYYY-MM-DD)"),
        limit: z.number().optional().describe("Max results for campaigns (default 25)"),
        campaignNameFilter: z.string().optional().describe("Filter campaigns by name (CONTAIN match). Use this to search for specific campaigns by keyword, course ID, or product name."),
      }),
      execute: async (params) => {
        try {
          if (!isMetaAdsConfigured()) {
            return {
              success: false,
              error: "Meta Ads is not configured.",
              needsConnection: true,
              service: "meta_ads",
            };
          }

          switch (params.action) {
            case "listAccounts": {
              const accounts = parseAccounts();
              return {
                success: true,
                service: "meta_ads",
                data: accounts,
                hint: "Use the accountId from the list to query a specific account.",
              };
            }

            case "overview": {
              const data = await queryOverview(
                params.dateRange || "last_14d",
                params.accountId,
                params.startDate,
                params.endDate
              );
              return {
                success: true,
                service: "meta_ads",
                data,
                hint: "Use campaigns to see per-campaign performance, or timeseries to see trends.",
              };
            }

            case "campaigns": {
              const data = await queryCampaigns(
                params.dateRange || "last_14d",
                params.accountId,
                params.limit || 25,
                params.startDate,
                params.endDate,
                params.campaignNameFilter
              );
              return {
                success: true,
                service: "meta_ads",
                data,
                rowCount: data.length,
                hint: "Use overview for account totals, or breakdown to analyze by audience.",
              };
            }

            case "timeseries": {
              const data = await queryTimeseries(
                params.dateRange || "last_14d",
                params.accountId,
                params.period || "day",
                params.startDate,
                params.endDate
              );
              return {
                success: true,
                service: "meta_ads",
                data,
                rowCount: data.length,
                hint: "Use breakdown to see which audiences or platforms perform best.",
              };
            }

            case "breakdown": {
              const data = await queryBreakdown(
                params.dimension || "age",
                params.dateRange || "last_14d",
                params.accountId,
                params.startDate,
                params.endDate
              );
              return {
                success: true,
                service: "meta_ads",
                data,
                rowCount: data.length,
                hint: "Use overview for account totals, or campaigns for per-campaign data.",
              };
            }
          }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            service: "meta_ads",
          };
        }
      },
    }),
  };
}
