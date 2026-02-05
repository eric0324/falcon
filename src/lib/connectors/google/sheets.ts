import {
  ConnectorCapabilities,
  ListParams,
  MutateParams,
  OperationResult,
} from "../base";
import { GoogleBaseConnector } from "./base";

interface SpreadsheetListResponse {
  files: Array<{
    id: string;
    name: string;
    mimeType: string;
  }>;
}

interface SheetData {
  range: string;
  majorDimension: string;
  values?: string[][];
}

interface SpreadsheetMetadata {
  spreadsheetId: string;
  properties: {
    title: string;
  };
  sheets: Array<{
    properties: {
      sheetId: number;
      title: string;
    };
  }>;
}

export class GoogleSheetsConnector extends GoogleBaseConnector {
  constructor(userId: string) {
    super({ userId, service: "SHEETS" });
  }

  getCapabilities(): ConnectorCapabilities {
    return {
      canQuery: false,
      canList: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
    };
  }

  /**
   * List spreadsheets or read spreadsheet data
   *
   * resource formats:
   * - "" or undefined: List all spreadsheets
   * - "spreadsheetId": Get spreadsheet metadata
   * - "spreadsheetId/sheetName" or "spreadsheetId/sheetName!A1:Z100": Read sheet data
   */
  async list(params: ListParams): Promise<OperationResult> {
    const resource = params.resource || "";

    try {
      // List all spreadsheets
      if (!resource) {
        return await this.listSpreadsheets();
      }

      // Parse resource: spreadsheetId or spreadsheetId/range
      const [spreadsheetId, range] = resource.split("/");

      if (!range) {
        // Get spreadsheet metadata
        return await this.getSpreadsheetMetadata(spreadsheetId);
      }

      // Read sheet data
      return await this.readSheetData(spreadsheetId, range);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Append data to a spreadsheet
   *
   * resource: "spreadsheetId/sheetName" or "spreadsheetId/sheetName!A:Z"
   * data.values: 2D array of values to append
   */
  async create(params: MutateParams): Promise<OperationResult> {
    const { resource, data } = params;

    if (!resource.includes("/")) {
      return { success: false, error: "Resource must be spreadsheetId/range" };
    }

    const [spreadsheetId, range] = resource.split("/");
    const values = data.values as string[][];

    if (!values || !Array.isArray(values)) {
      return { success: false, error: "data.values must be a 2D array" };
    }

    try {
      const result = await this.googleFetch<{ updates: { updatedRows: number } }>(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        {
          method: "POST",
          body: JSON.stringify({ values }),
        }
      );

      return {
        success: true,
        data: result,
        rowCount: result.updates?.updatedRows || values.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Update data in a spreadsheet
   *
   * resource: "spreadsheetId/range" (e.g., "spreadsheetId/Sheet1!A1:C3")
   * data.values: 2D array of values to update
   */
  async update(params: MutateParams): Promise<OperationResult> {
    const { resource, data } = params;

    if (!resource.includes("/")) {
      return { success: false, error: "Resource must be spreadsheetId/range" };
    }

    const [spreadsheetId, range] = resource.split("/");
    const values = data.values as string[][];

    if (!values || !Array.isArray(values)) {
      return { success: false, error: "data.values must be a 2D array" };
    }

    try {
      const result = await this.googleFetch<{ updatedRows: number }>(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
        {
          method: "PUT",
          body: JSON.stringify({ values }),
        }
      );

      return {
        success: true,
        data: result,
        rowCount: result.updatedRows,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Clear (delete) data in a spreadsheet range
   *
   * resource: "spreadsheetId/range" (e.g., "spreadsheetId/Sheet1!A1:C3")
   */
  async delete(params: MutateParams): Promise<OperationResult> {
    const { resource } = params;

    if (!resource.includes("/")) {
      return { success: false, error: "Resource must be spreadsheetId/range" };
    }

    const [spreadsheetId, range] = resource.split("/");

    try {
      const result = await this.googleFetch<{ clearedRange: string }>(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`,
        { method: "POST" }
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // Private helper methods

  private async listSpreadsheets(): Promise<OperationResult> {
    // Use Drive API to list spreadsheets
    const result = await this.googleFetch<SpreadsheetListResponse>(
      `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet'&fields=files(id,name,mimeType)&orderBy=modifiedTime desc`
    );

    return {
      success: true,
      data: result.files.map((file) => ({
        id: file.id,
        name: file.name,
        type: "spreadsheet",
      })),
      rowCount: result.files.length,
    };
  }

  private async getSpreadsheetMetadata(
    spreadsheetId: string
  ): Promise<OperationResult> {
    const result = await this.googleFetch<SpreadsheetMetadata>(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title,sheets.properties`
    );

    return {
      success: true,
      data: {
        id: result.spreadsheetId,
        title: result.properties.title,
        sheets: result.sheets.map((s) => ({
          id: s.properties.sheetId,
          title: s.properties.title,
        })),
      },
    };
  }

  private async readSheetData(
    spreadsheetId: string,
    range: string
  ): Promise<OperationResult> {
    const result = await this.googleFetch<SheetData>(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`
    );

    const values = result.values || [];

    // Convert to array of objects if first row looks like headers
    if (values.length > 1) {
      const headers = values[0];
      const rows = values.slice(1).map((row) => {
        const obj: Record<string, string> = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || "";
        });
        return obj;
      });

      return {
        success: true,
        data: {
          headers,
          rows,
          raw: values,
        },
        rowCount: rows.length,
      };
    }

    return {
      success: true,
      data: { raw: values },
      rowCount: values.length,
    };
  }
}
