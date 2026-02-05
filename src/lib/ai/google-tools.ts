import { tool } from "ai";
import { z } from "zod";
import { GoogleSheetsConnector } from "@/lib/connectors/google/sheets";
import { GoogleDriveConnector } from "@/lib/connectors/google/drive";
import { GoogleCalendarConnector } from "@/lib/connectors/google/calendar";
import { GoogleGmailConnector } from "@/lib/connectors/google/gmail";
import { getGoogleConnectionStatus } from "@/lib/google/token-manager";
import { googleServiceToDataSourceType } from "@/types/data-source";

type GoogleService = "sheets" | "drive" | "calendar" | "gmail";

/**
 * 從資源路徑中提取 resourceId
 * 例如: "abc123/Sheet1!A1:Z100" -> "abc123"
 */
function extractResourceId(resource: string): string {
  if (!resource) return "";
  const parts = resource.split("/");
  return parts[0];
}

/**
 * 從結果中提取資源名稱
 */
function extractResourceName(
  service: GoogleService,
  resource: string,
  data: unknown
): string {
  if (!resource) return "";

  // 嘗試從資料中取得名稱
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (obj.title) return String(obj.title);
    if (obj.name) return String(obj.name);
    if (obj.summary) return String(obj.summary);
  }

  // 否則用 resourceId
  return extractResourceId(resource);
}

/**
 * Create Google tools bound to a specific user
 */
export function createGoogleTools(userId: string) {
  return {
    /**
     * Search and retrieve data from Google services
     */
    googleSearch: tool({
      description: `搜尋使用者的 Google 資料。使用此工具來：
- 列出 Google 試算表並讀取內容
- 搜尋 Google 雲端硬碟中的檔案
- 查詢 Google 日曆的事件
- 搜尋 Gmail 郵件

使用者必須先連接對應的 Google 服務才能使用。如果服務未連接，請提示使用者先在「資料來源」選單中連接。`,
      inputSchema: z.object({
        service: z.enum(["sheets", "drive", "calendar", "gmail"]).describe("要搜尋的 Google 服務"),
        action: z.enum(["list", "read"]).optional().describe("list: 列出資源清單, read: 讀取特定資源內容。預設為 list"),
        resource: z.string().optional().describe("資源 ID。Sheets: spreadsheetId；Drive: folderId 或 file:fileId；Calendar: calendarId 或 primary；Gmail: thread:threadId 或 message:messageId"),
        search: z.string().optional().describe("搜尋關鍵字。Gmail 支援進階搜尋語法如 from:xxx subject:xxx"),
        mimeType: z.string().optional().describe("檔案類型過濾 (僅 Drive)"),
        timeMin: z.string().optional().describe("開始時間 ISO 格式 (僅 Calendar)"),
        timeMax: z.string().optional().describe("結束時間 ISO 格式 (僅 Calendar)"),
        label: z.string().optional().describe("郵件標籤過濾 (僅 Gmail)，如 INBOX, SENT, UNREAD"),
        limit: z.number().optional().describe("最多返回幾筆結果，預設 20"),
      }),
      execute: async (params) => {
        // Apply defaults manually since zod defaults may not work with AI SDK
        const service = params.service;
        const action = params.action || "list";
        const resource = params.resource;
        const search = params.search;
        const mimeType = params.mimeType;
        const timeMin = params.timeMin;
        const timeMax = params.timeMax;
        const label = (params as { label?: string }).label;
        const limit = params.limit;

        console.log(`[googleSearch] Called with params:`, JSON.stringify(params));

        try {
          // Check if service is connected
          console.log(`[googleSearch] Checking status for userId: ${userId}, service: ${service}`);
          const status = await getGoogleConnectionStatus(userId);
          console.log(`[googleSearch] Status result:`, status);
          const statusKey = service.toUpperCase() as "SHEETS" | "DRIVE" | "CALENDAR" | "GMAIL";

          if (!status[statusKey]) {
            console.log(`[googleSearch] Service ${service} not connected`);
            return {
              success: false,
              error: `Google ${service} 尚未連接。請先在「資料來源」選單中點擊「連接」按鈕。`,
              needsConnection: true,
              service,
            };
          }
          console.log(`[googleSearch] Service ${service} is connected, proceeding`);

          // Create appropriate connector
          let connector;
          switch (service) {
            case "sheets":
              connector = new GoogleSheetsConnector(userId);
              break;
            case "drive":
              connector = new GoogleDriveConnector(userId);
              break;
            case "calendar":
              connector = new GoogleCalendarConnector(userId);
              break;
            case "gmail":
              connector = new GoogleGmailConnector(userId);
              break;
            default:
              return { success: false, error: `Unknown service: ${service}` };
          }

          // Connect to get valid token
          await connector.connect();

          // Build filters
          const filters: Record<string, unknown> = {};
          if (search) filters.search = search;
          if (mimeType) filters.mimeType = mimeType;
          if (timeMin) filters.timeMin = timeMin;
          if (timeMax) filters.timeMax = timeMax;
          if (label) filters.label = label;

          // Execute the operation
          const result = await connector.list({
            resource: resource || "",
            filters,
            limit: limit || 20,
          });

          if (!result.success) {
            return {
              success: false,
              error: result.error,
              service,
            };
          }

          // 提取資源資訊用於追蹤
          const resourceId = extractResourceId(resource || "");
          const resourceName = extractResourceName(service, resource || "", result.data);

          return {
            success: true,
            service,
            action,
            resource: resource || "(root)",
            data: result.data,
            rowCount: result.rowCount,
            // 追蹤使用的資料來源（前端會收集這些）
            usedDataSource: resourceId ? {
              type: googleServiceToDataSourceType(service),
              resourceId,
              resourceName: resourceName || resourceId,
            } : null,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            service,
          };
        }
      },
    }),

    /**
     * Write data to Google services (Sheets, Calendar)
     */
    googleWrite: tool({
      description: `寫入資料到 Google 服務。可以：
- 在 Google 試算表中新增或更新資料
- 在 Google 日曆中建立、更新或刪除事件

注意：Google Drive 是唯讀的，無法寫入。`,
      inputSchema: z.object({
        service: z.enum(["sheets", "calendar"]).describe("要寫入的 Google 服務"),
        action: z.enum(["create", "update", "delete"]).describe("create: 新增, update: 更新, delete: 刪除"),
        resource: z.string().describe("資源路徑。Sheets: spreadsheetId/SheetName；Calendar: calendarId 或 calendarId/eventId"),
        data: z.record(z.string(), z.unknown()).describe("要寫入的資料"),
      }),
      execute: async ({ service, action, resource, data }) => {
        try {
          // Check if service is connected
          const status = await getGoogleConnectionStatus(userId);
          const statusKey = service.toUpperCase() as "SHEETS" | "CALENDAR";

          if (!status[statusKey]) {
            return {
              success: false,
              error: `Google ${service} 尚未連接。請先在「資料來源」選單中點擊「連接」按鈕。`,
              needsConnection: true,
              service,
            };
          }

          // Create appropriate connector
          let connector;
          switch (service) {
            case "sheets":
              connector = new GoogleSheetsConnector(userId);
              break;
            case "calendar":
              connector = new GoogleCalendarConnector(userId);
              break;
            default:
              return { success: false, error: `Unknown service: ${service}` };
          }

          await connector.connect();

          // Execute the operation
          let result;
          switch (action) {
            case "create":
              result = await connector.create({ resource, data });
              break;
            case "update":
              result = await connector.update({ resource, data });
              break;
            case "delete":
              result = await connector.delete({ resource, data });
              break;
            default:
              return { success: false, error: `Unknown action: ${action}` };
          }

          if (!result.success) {
            return {
              success: false,
              error: result.error,
              service,
              action,
            };
          }

          // 提取資源資訊用於追蹤
          const resourceId = extractResourceId(resource);

          return {
            success: true,
            service,
            action,
            resource,
            data: result.data,
            rowCount: result.rowCount,
            // 追蹤使用的資料來源
            usedDataSource: {
              type: googleServiceToDataSourceType(service),
              resourceId,
              resourceName: resourceId,
            },
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            service,
            action,
          };
        }
      },
    }),

    /**
     * Get Google services connection status
     */
    googleStatus: tool({
      description: "檢查使用者的 Google 服務連接狀態，了解哪些服務已連接可用。",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const status = await getGoogleConnectionStatus(userId);

          return {
            success: true,
            connections: {
              sheets: status.SHEETS,
              drive: status.DRIVE,
              calendar: status.CALENDAR,
              gmail: status.GMAIL,
            },
            message: Object.entries(status)
              .filter(([, connected]) => connected)
              .map(([service]) => service.toLowerCase())
              .join(", ") || "尚未連接任何 Google 服務",
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),
  };
}
