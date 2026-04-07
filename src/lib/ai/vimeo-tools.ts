import { tool } from "ai";
import { z } from "zod";
import {
  isVimeoConfigured,
  listVideos,
  getVideo,
  listFolders,
  getFolderVideos,
  getAnalytics,
} from "@/lib/integrations/vimeo";

export function createVimeoTools() {
  return {
    vimeoQuery: tool({
      description: `查詢 Vimeo 影片資料與觀看分析。

操作：
- videos：列出影片清單（名稱、時長、觀看次數、上傳日期）
- video：查詢單支影片詳情（需要 videoId）
- folders：列出資料夾
- folder_videos：列出資料夾內的影片（需要 folderId）
- analytics：查詢觀看分析（需要 startDate、endDate）

analytics 支援的 dimension：total、video、country、device_type、embed_domain
analytics 回傳指標包含：views、impressions、unique_viewers、finishes、mean_percent_watched 等`,
      inputSchema: z.object({
        action: z.enum(["videos", "video", "folders", "folder_videos", "analytics"])
          .describe("操作類型"),
        videoId: z.string().optional().describe("影片 ID（video 用），例如 '123456789'"),
        folderId: z.string().optional().describe("資料夾 ID（folder_videos 用）"),
        startDate: z.string().optional().describe("分析起始日期 YYYY-MM-DD（analytics 用）"),
        endDate: z.string().optional().describe("分析結束日期 YYYY-MM-DD（analytics 用）"),
        dimension: z.string().optional().describe("分析維度：total, video, country, device_type, embed_domain（analytics 用）"),
        timeInterval: z.string().optional().describe("時間區間：day, week, month, year（analytics 用）"),
        videoUri: z.string().optional().describe("篩選特定影片，格式 /videos/123456789（analytics 用）"),
        folderUri: z.string().optional().describe("篩選特定資料夾（analytics 用）"),
        maxResults: z.number().optional().describe("最多回傳幾筆，預設 25"),
      }),
      execute: async (params) => {
        try {
          if (!(await isVimeoConfigured())) {
            return {
              success: false,
              error: "Vimeo 尚未設定。請聯絡管理員設定 VIMEO_ACCESS_TOKEN。",
              service: "vimeo",
            };
          }

          const { action, maxResults = 25 } = params;

          switch (action) {
            case "videos": {
              const data = await listVideos(maxResults);
              return { success: true, service: "vimeo", data, rowCount: data.length };
            }

            case "video": {
              if (!params.videoId) {
                return { success: false, error: "video 需要 videoId 參數", service: "vimeo" };
              }
              const data = await getVideo(params.videoId);
              if (!data) {
                return { success: false, error: "找不到該影片", service: "vimeo" };
              }
              return { success: true, service: "vimeo", data };
            }

            case "folders": {
              const data = await listFolders(maxResults);
              return { success: true, service: "vimeo", data, rowCount: data.length };
            }

            case "folder_videos": {
              if (!params.folderId) {
                return { success: false, error: "folder_videos 需要 folderId 參數", service: "vimeo" };
              }
              const data = await getFolderVideos(params.folderId, maxResults);
              return { success: true, service: "vimeo", data, rowCount: data.length };
            }

            case "analytics": {
              if (!params.startDate || !params.endDate) {
                return {
                  success: false,
                  error: "analytics 需要 startDate 和 endDate 參數（格式 YYYY-MM-DD）",
                  service: "vimeo",
                };
              }
              const data = await getAnalytics({
                startDate: params.startDate,
                endDate: params.endDate,
                dimension: params.dimension,
                timeInterval: params.timeInterval,
                videoUri: params.videoUri,
                folderUri: params.folderUri,
              });
              return { success: true, service: "vimeo", data, rowCount: data.data.length };
            }

            default:
              return { success: false, error: `不支援的操作: ${action}`, service: "vimeo" };
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          // Graceful fallback for stats scope issue
          if (message.includes("403") || message.includes("forbidden")) {
            return {
              success: false,
              error: "此 Vimeo 帳號可能不支援分析功能（需要 Pro 以上方案），或 token 權限不足。",
              service: "vimeo",
            };
          }
          return { success: false, error: message, service: "vimeo" };
        }
      },
    }),
  };
}
