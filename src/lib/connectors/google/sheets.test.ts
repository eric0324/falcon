import { describe, it, expect, vi, beforeEach } from "vitest";
import { GoogleSheetsConnector } from "./sheets";

// Mock the token manager
vi.mock("@/lib/google/token-manager", () => ({
  getValidAccessToken: vi.fn().mockResolvedValue("mock-access-token"),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("GoogleSheetsConnector", () => {
  let connector: GoogleSheetsConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new GoogleSheetsConnector("test-user-id");
  });

  describe("getCapabilities", () => {
    it("should return correct capabilities", () => {
      const caps = connector.getCapabilities();
      expect(caps).toEqual({
        canQuery: false,
        canList: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      });
    });
  });

  describe("connect", () => {
    it("should get valid access token", async () => {
      await connector.connect();
      // Should not throw
    });
  });

  describe("list", () => {
    beforeEach(async () => {
      await connector.connect();
    });

    it("should list spreadsheets when no resource specified", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            files: [
              { id: "sheet1", name: "My Spreadsheet", mimeType: "application/vnd.google-apps.spreadsheet" },
              { id: "sheet2", name: "Another Sheet", mimeType: "application/vnd.google-apps.spreadsheet" },
            ],
          }),
      });

      const result = await connector.list({});

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        id: "sheet1",
        name: "My Spreadsheet",
        type: "spreadsheet",
      });
    });

    it("should get spreadsheet metadata when resource is spreadsheetId", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            spreadsheetId: "sheet1",
            properties: { title: "My Spreadsheet" },
            sheets: [
              { properties: { sheetId: 0, title: "Sheet1" } },
              { properties: { sheetId: 1, title: "Sheet2" } },
            ],
          }),
      });

      const result = await connector.list({ resource: "sheet1" });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: "sheet1",
        title: "My Spreadsheet",
        sheets: [
          { id: 0, title: "Sheet1" },
          { id: 1, title: "Sheet2" },
        ],
      });
    });

    it("should read sheet data when resource includes range", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            range: "Sheet1!A1:C3",
            majorDimension: "ROWS",
            values: [
              ["Name", "Age", "City"],
              ["Alice", "30", "New York"],
              ["Bob", "25", "Los Angeles"],
            ],
          }),
      });

      const result = await connector.list({ resource: "sheet1/Sheet1!A1:C3" });

      expect(result.success).toBe(true);
      expect(result.data.headers).toEqual(["Name", "Age", "City"]);
      expect(result.data.rows).toHaveLength(2);
      expect(result.data.rows[0]).toEqual({
        Name: "Alice",
        Age: "30",
        City: "New York",
      });
    });
  });

  describe("create", () => {
    beforeEach(async () => {
      await connector.connect();
    });

    it("should append data to spreadsheet", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            updates: {
              updatedRows: 2,
            },
          }),
      });

      const result = await connector.create({
        resource: "sheet1/Sheet1",
        data: {
          values: [
            ["Charlie", "35", "Chicago"],
            ["Diana", "28", "Houston"],
          ],
        },
      });

      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(2);
    });

    it("should fail if resource format is invalid", async () => {
      const result = await connector.create({
        resource: "sheet1", // Missing range
        data: { values: [["test"]] },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("spreadsheetId/range");
    });
  });

  describe("update", () => {
    beforeEach(async () => {
      await connector.connect();
    });

    it("should update data in spreadsheet", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            updatedRows: 1,
          }),
      });

      const result = await connector.update({
        resource: "sheet1/Sheet1!A2:C2",
        data: {
          values: [["Alice Updated", "31", "Boston"]],
        },
      });

      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(1);
    });
  });

  describe("delete", () => {
    beforeEach(async () => {
      await connector.connect();
    });

    it("should clear data in spreadsheet range", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            clearedRange: "Sheet1!A2:C2",
          }),
      });

      const result = await connector.delete({
        resource: "sheet1/Sheet1!A2:C2",
        data: {},
      });

      expect(result.success).toBe(true);
    });
  });
});
