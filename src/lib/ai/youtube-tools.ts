import { tool } from "ai";
import { z } from "zod";
import { getValidAccessToken } from "@/lib/google/token-manager";
import {
  searchVideos,
  getChannelInfo,
  getVideoDetails,
  getVideoComments,
  getVideoCaptions,
  getPlaylistItems,
  getAnalyticsReport,
} from "@/lib/integrations/youtube/client";

export function createYouTubeTools(userId: string) {
  return {
    youtubeQuery: tool({
      description: `查詢 YouTube 數據。支援搜尋影片、查看頻道資訊、影片統計、留言、字幕、播放清單和 Analytics 分析。

操作：
- search：搜尋影片（消耗 100 quota units，盡量少用）
- channel：查詢頻道資訊（訂閱數、影片數、觀看數）
- video：查詢影片詳情（觀看數、按讚數、留言數、時長）
- comments：查詢影片留言
- captions：下載影片字幕
- playlist：查詢播放清單內容
- analytics：查詢頻道 Analytics（觀看時長、流量來源等，需要頻道擁有者授權）

建議策略：先用 channel 取得頻道資訊，再用 video 查看特定影片，避免頻繁使用 search。`,
      inputSchema: z.object({
        action: z.enum(["search", "channel", "video", "comments", "captions", "playlist", "analytics"])
          .describe("操作類型"),
        query: z.string().optional().describe("搜尋關鍵字（search 用）"),
        channelId: z.string().optional().describe("頻道 ID（channel/analytics 用）"),
        videoId: z.string().optional().describe("影片 ID（video/comments/captions 用）"),
        playlistId: z.string().optional().describe("播放清單 ID（playlist 用）"),
        startDate: z.string().optional().describe("分析起始日期 YYYY-MM-DD（analytics 用）"),
        endDate: z.string().optional().describe("分析結束日期 YYYY-MM-DD（analytics 用）"),
        metrics: z.array(z.string()).optional()
          .describe("Analytics 指標，如 views, estimatedMinutesWatched, subscribersGained"),
        dimensions: z.array(z.string()).optional()
          .describe("Analytics 維度，如 day, country, video, deviceType"),
        maxResults: z.number().optional().describe("最多返回幾筆結果，預設 10"),
        language: z.string().optional().describe("字幕語言偏好（captions 用）"),
      }),
      execute: async (params) => {
        try {
          const accessToken = await getValidAccessToken(userId, "YOUTUBE");
          if (!accessToken) {
            return {
              success: false,
              error: "YouTube 尚未連接。請先在資料來源中連接 YouTube。",
              needsConnection: true,
              service: "youtube",
            };
          }

          const { action, maxResults = 10 } = params;

          switch (action) {
            case "search": {
              if (!params.query) {
                return { success: false, error: "search 需要 query 參數", service: "youtube" };
              }
              const data = await searchVideos(accessToken, params.query, maxResults);
              return { success: true, service: "youtube", data, rowCount: data.length };
            }

            case "channel": {
              if (!params.channelId) {
                return { success: false, error: "channel 需要 channelId 參數", service: "youtube" };
              }
              const data = await getChannelInfo(accessToken, params.channelId);
              if (!data) {
                return { success: false, error: "找不到該頻道", service: "youtube" };
              }
              return { success: true, service: "youtube", data };
            }

            case "video": {
              if (!params.videoId) {
                return { success: false, error: "video 需要 videoId 參數", service: "youtube" };
              }
              const data = await getVideoDetails(accessToken, params.videoId);
              if (!data) {
                return { success: false, error: "找不到該影片", service: "youtube" };
              }
              return { success: true, service: "youtube", data };
            }

            case "comments": {
              if (!params.videoId) {
                return { success: false, error: "comments 需要 videoId 參數", service: "youtube" };
              }
              const data = await getVideoComments(accessToken, params.videoId, maxResults);
              return { success: true, service: "youtube", data, rowCount: data.length };
            }

            case "captions": {
              if (!params.videoId) {
                return { success: false, error: "captions 需要 videoId 參數", service: "youtube" };
              }
              const data = await getVideoCaptions(accessToken, params.videoId, params.language);
              if (!data) {
                return { success: false, error: "該影片沒有可用的字幕", service: "youtube" };
              }
              return { success: true, service: "youtube", data };
            }

            case "playlist": {
              if (!params.playlistId) {
                return { success: false, error: "playlist 需要 playlistId 參數", service: "youtube" };
              }
              const data = await getPlaylistItems(accessToken, params.playlistId, maxResults);
              return { success: true, service: "youtube", data, rowCount: data.length };
            }

            case "analytics": {
              if (!params.channelId || !params.startDate || !params.endDate) {
                return {
                  success: false,
                  error: "analytics 需要 channelId、startDate、endDate 參數",
                  service: "youtube",
                };
              }
              const data = await getAnalyticsReport(accessToken, params.channelId, {
                startDate: params.startDate,
                endDate: params.endDate,
                metrics: params.metrics || ["views", "estimatedMinutesWatched"],
                dimensions: params.dimensions,
              });
              return { success: true, service: "youtube", data };
            }

            default:
              return { success: false, error: `不支援的操作: ${action}`, service: "youtube" };
          }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            service: "youtube",
          };
        }
      },
    }),
  };
}
