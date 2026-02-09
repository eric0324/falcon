import { tool } from "ai";
import { z } from "zod";
import {
  isSlackConfigured,
  isSlackSearchConfigured,
  listChannels,
  getChannelMessages,
  getThreadReplies,
  searchMessages,
} from "@/lib/integrations/slack";

export function createSlackTools() {
  return {
    slackSearch: tool({
      description: `存取 Slack 公開頻道資料。善用平行呼叫同時讀取多個頻道。

操作：
- list：列出所有公開頻道（永遠先做這步）
- read：讀取頻道最新訊息（用 channelId）
- thread：讀取討論串回覆（用 channelId + threadTs）
- search：全文搜尋公開頻道訊息（用 search 關鍵字）`,
      inputSchema: z.object({
        action: z.enum(["list", "read", "thread", "search"]).optional()
          .describe("list: 列出頻道, read: 讀取頻道訊息, thread: 讀取討論串, search: 搜尋訊息。預設為 list"),
        channelId: z.string().optional().describe("頻道 ID（用於 read 和 thread）"),
        threadTs: z.string().optional().describe("討論串的 timestamp（用於 thread）"),
        search: z.string().optional().describe("搜尋關鍵字（用於 search）"),
        limit: z.number().optional().describe("最多返回幾筆結果，預設 20"),
      }),
      execute: async (params) => {
        const { action, channelId, threadTs, search, limit = 20 } = params;

        try {
          if (!isSlackConfigured()) {
            return {
              success: false,
              error: "Slack 尚未設定。請在環境變數中設定 SLACK_BOT_TOKEN。",
              needsConnection: true,
              service: "slack",
            };
          }

          // Read thread replies
          if (action === "thread" && channelId && threadTs) {
            const data = await getThreadReplies(channelId, threadTs);
            return {
              success: true,
              service: "slack",
              data,
              rowCount: data.length,
            };
          }

          // Read channel messages
          if (action === "read" && channelId) {
            const data = await getChannelMessages(channelId, limit);
            return {
              success: true,
              service: "slack",
              data,
              rowCount: data.length,
              hint: "訊息有 replyCount > 0 的表示有討論串，用 thread(channelId, threadTs) 讀取回覆。",
            };
          }

          // Search messages
          if (action === "search" && search) {
            if (!isSlackSearchConfigured()) {
              return {
                success: false,
                error: "搜尋功能未啟用，請設定 SLACK_USER_TOKEN。",
                service: "slack",
              };
            }
            const data = await searchMessages(search, limit);
            return {
              success: true,
              service: "slack",
              data,
              rowCount: data.length,
              hint: "搜尋結果僅包含公開頻道訊息。用 read(channelId) 看更多上下文。",
            };
          }

          // Default: list channels
          const data = await listChannels();
          return {
            success: true,
            service: "slack",
            data,
            rowCount: data.length,
            hint: "用 read(channelId) 讀取頻道訊息，或 search(關鍵字) 搜尋。",
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            service: "slack",
          };
        }
      },
    }),
  };
}
