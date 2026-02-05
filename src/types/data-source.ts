/**
 * 資料來源類型
 */
export type DataSourceType =
  | "GOOGLE_SHEETS"
  | "GOOGLE_DRIVE"
  | "GOOGLE_CALENDAR"
  | "REST_API"
  | "POSTGRES"
  | "MYSQL";

/**
 * 工具使用的資料來源定義
 * 儲存在 Tool.dataSources 欄位
 */
export interface ToolDataSource {
  /** 資料來源類型 */
  type: DataSourceType;

  /** 資源 ID（例如 spreadsheetId, folderId, calendarId） */
  resourceId?: string;

  /** 資源名稱（顯示用，例如「2024 銷售報表」） */
  resourceName?: string;

  /** 額外設定（例如 sheet range, API endpoint） */
  config?: Record<string, unknown>;
}

/**
 * Google 資源資訊（從 API 返回）
 */
export interface GoogleResourceInfo {
  type: "GOOGLE_SHEETS" | "GOOGLE_DRIVE" | "GOOGLE_CALENDAR";
  resourceId: string;
  resourceName: string;
}

/**
 * 檢查是否為 Google 資料來源類型
 */
export function isGoogleDataSource(type: DataSourceType): boolean {
  return type.startsWith("GOOGLE_");
}

/**
 * 從 Google service 名稱轉換為 DataSourceType
 */
export function googleServiceToDataSourceType(
  service: "sheets" | "drive" | "calendar"
): DataSourceType {
  const mapping: Record<string, DataSourceType> = {
    sheets: "GOOGLE_SHEETS",
    drive: "GOOGLE_DRIVE",
    calendar: "GOOGLE_CALENDAR",
  };
  return mapping[service];
}
