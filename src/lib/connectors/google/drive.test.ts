import { describe, it, expect, vi, beforeEach } from "vitest";
import { GoogleDriveConnector } from "./drive";

// Mock the token manager
vi.mock("@/lib/google/token-manager", () => ({
  getValidAccessToken: vi.fn().mockResolvedValue("mock-access-token"),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("GoogleDriveConnector", () => {
  let connector: GoogleDriveConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new GoogleDriveConnector("test-user-id");
  });

  describe("getCapabilities", () => {
    it("should return correct capabilities (read-only)", () => {
      const caps = connector.getCapabilities();
      expect(caps).toEqual({
        canQuery: false,
        canList: true,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
      });
    });
  });

  describe("list", () => {
    beforeEach(async () => {
      await connector.connect();
    });

    it("should list files in root when no resource specified", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            files: [
              {
                id: "file1",
                name: "Document.pdf",
                mimeType: "application/pdf",
                modifiedTime: "2024-01-15T10:00:00Z",
                size: "1024",
              },
              {
                id: "folder1",
                name: "My Folder",
                mimeType: "application/vnd.google-apps.folder",
              },
            ],
          }),
      });

      const result = await connector.list({});
      const data = result.data as any[];

      expect(result.success).toBe(true);
      expect(data).toHaveLength(2);
      expect(data[0]).toMatchObject({
        id: "file1",
        name: "Document.pdf",
        isFolder: false,
      });
      expect(data[1]).toMatchObject({
        id: "folder1",
        name: "My Folder",
        isFolder: true,
      });
    });

    it("should list files in specific folder", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            files: [
              {
                id: "file2",
                name: "Report.docx",
                mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              },
            ],
          }),
      });

      const result = await connector.list({ resource: "folder1" });

      expect(result.success).toBe(true);
      // URL is encoded, so check for the encoded version
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("folder1"),
        expect.anything()
      );
    });

    it("should get file metadata when resource is file:fileId", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "file1",
            name: "Document.pdf",
            mimeType: "application/pdf",
            createdTime: "2024-01-01T00:00:00Z",
            modifiedTime: "2024-01-15T10:00:00Z",
            size: "2048",
            webViewLink: "https://drive.google.com/file/d/file1/view",
          }),
      });

      const result = await connector.list({ resource: "file:file1" });
      const data = result.data as any;

      expect(result.success).toBe(true);
      expect(data.id).toBe("file1");
      expect(data.name).toBe("Document.pdf");
      expect(data.size).toBe(2048);
    });

    it("should filter by mimeType", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [] }),
      });

      await connector.list({
        filters: { mimeType: "application/pdf" },
      });

      // URL is encoded
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("application%2Fpdf"),
        expect.anything()
      );
    });

    it("should support search filter", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [] }),
      });

      await connector.list({
        filters: { search: "report" },
      });

      // URL is encoded
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("report"),
        expect.anything()
      );
    });
  });
});
