import { tool } from "ai";
import { z } from "zod";
import {
  isWebinarjamConfigured,
  listWebinars,
  getWebinar,
  getRegistrants,
} from "@/lib/integrations/webinarjam";

const attendedLiveSchema = z
  .union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
  .optional()
  .describe(
    "現場參與篩選：0=全部、1=有出席直播、2=沒出席直播、3=出席但提早離開、4=出席且停留超過指定時間"
  );

const attendedReplaySchema = z
  .union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
  .optional()
  .describe(
    "重播參與篩選：0=全部、1=有看 replay、2=沒看 replay、3=看了但提早離開、4=看了且停留超過指定時間"
  );

const purchasedSchema = z
  .union([z.literal(0), z.literal(1), z.literal(2)])
  .optional()
  .describe("購買篩選：0=全部、1=有購買、2=沒購買");

export const webinarjamQueryInputSchema = z.object({
  action: z
    .enum(["list", "get", "registrants"])
    .optional()
    .describe("操作。預設 list"),
  webinarId: z
    .string()
    .optional()
    .describe("Webinar ID（get / registrants 必填）"),
  scheduleId: z
    .number()
    .optional()
    .describe(
      "Schedule ID（registrants 必填）。整數，必須等於前一次 get 回傳的 schedules[].schedule 欄位值（不是陣列 index）。例如 schedules: [{ schedule: 44 }] 就傳 44"
    ),
  attendedLive: attendedLiveSchema,
  attendedReplay: attendedReplaySchema,
  purchased: purchasedSchema,
  search: z
    .string()
    .optional()
    .describe("關鍵字搜尋（姓名 / email）"),
  page: z.number().optional().describe("分頁頁碼，從 1 開始"),
});

export function createWebinarjamTools() {
  return {
    webinarjamQuery: tool({
      description: `查詢 WebinarJam 的 webinar 與報名 / 出席資料。本工具唯讀，不做報名或取消訂閱。

操作：
- list：列出所有 webinars（webinar_id、name、type、schedules、timezone）
- get：查單一 webinar 詳情，含 schedules 陣列（每個 schedule 有 date 與 schedule ID）、presenters、registration_url。需要 webinarId
- registrants：列出某場次的報名與出席名單。需要 webinarId 與 scheduleId。scheduleId 必須是前一次 get 回傳的 schedules 陣列裡某個物件的 schedule 欄位（整數，可能很大例如 44、127），不要用陣列 index、不要憑空產生

registrants 可加 server-side filter：
- attendedLive 0/1/2/3/4：篩現場出席狀態
- attendedReplay 0/1/2/3/4：篩重播觀看狀態
- purchased 0/1/2：篩購買狀態
- search：以姓名 / email 等做關鍵字過濾
- page：分頁，從 1 開始；大 webinar 多筆可逐頁取

範例：
- 「上週 webinar 誰來了」→ list 找近期 webinar → get 拿 scheduleId → registrants(attendedLive=1)
- 「誰看了 replay 但沒買」→ registrants(attendedReplay=1, purchased=2)`,
      inputSchema: webinarjamQueryInputSchema,
      execute: async (params) => {
        try {
          if (!(await isWebinarjamConfigured())) {
            return {
              success: false,
              service: "webinarjam",
              needsConnection: true,
              error: "WebinarJam 尚未設定。請聯絡管理員設定 WEBINARJAM_API_KEY。",
            };
          }

          const action = params.action ?? "list";

          if (action === "list") {
            const data = await listWebinars();
            return {
              success: true,
              service: "webinarjam",
              data,
              rowCount: data.length,
            };
          }

          if (action === "get") {
            if (!params.webinarId) {
              return {
                success: false,
                service: "webinarjam",
                error: "get 動作需要 webinarId 參數。",
              };
            }
            const data = await getWebinar(params.webinarId);
            return { success: true, service: "webinarjam", data };
          }

          // registrants
          if (!params.webinarId) {
            return {
              success: false,
              service: "webinarjam",
              error: "registrants 動作需要 webinarId 參數。",
            };
          }
          if (params.scheduleId === undefined || params.scheduleId === null) {
            return {
              success: false,
              service: "webinarjam",
              error: "registrants 動作需要 scheduleId 參數。請先用 get 取得該 webinar 的 schedules。",
            };
          }

          const data = await getRegistrants({
            webinarId: params.webinarId,
            scheduleId: params.scheduleId,
            attendedLive: params.attendedLive,
            attendedReplay: params.attendedReplay,
            purchased: params.purchased,
            search: params.search,
            page: params.page,
          });
          return {
            success: true,
            service: "webinarjam",
            data,
            rowCount: data.length,
            metadata: { page: params.page ?? 1 },
            hint: data.length === 0
              ? "找不到結果。試試放寬 filter 或檢查 webinarId / scheduleId 是否正確。"
              : "如需更多筆，把 page 加 1 再呼叫。",
          };
        } catch (error) {
          return {
            success: false,
            service: "webinarjam",
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),
  };
}
