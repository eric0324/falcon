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
      const data = result.data as Record<string, unknown>[];

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
      const data = result.data as Record<string, unknown>;

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

  describe("searchImportableFiles", () => {
    beforeEach(async () => {
      await connector.connect();
    });

    it("requests Docs and Sheets sorted by modifiedTime desc with given pageSize", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [] }),
      });

      await connector.searchImportableFiles({ query: "會議", pageSize: 25 });

      const url = new URL(mockFetch.mock.calls[0][0] as string);
      expect(url.searchParams.get("orderBy")).toBe("modifiedTime desc");
      expect(url.searchParams.get("pageSize")).toBe("25");
      const q = url.searchParams.get("q") || "";
      expect(q).toContain("application/vnd.google-apps.document");
      expect(q).toContain("application/vnd.google-apps.spreadsheet");
      expect(q).toContain("trashed=false");
      expect(q).toContain("會議");
    });

    it("forwards pageToken when cursor is given", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [] }),
      });

      await connector.searchImportableFiles({ query: "", cursor: "abc-cursor" });

      const url = new URL(mockFetch.mock.calls[0][0] as string);
      expect(url.searchParams.get("pageToken")).toBe("abc-cursor");
    });

    it("resolves parent folder names with one fetch per unique parent", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            files: [
              {
                id: "f1",
                name: "Doc A",
                mimeType: "application/vnd.google-apps.document",
                parents: ["folder-1"],
                modifiedTime: "2026-04-16T00:00:00Z",
                webViewLink: "https://docs.google.com/document/d/f1/edit",
              },
              {
                id: "f2",
                name: "Doc B",
                mimeType: "application/vnd.google-apps.document",
                parents: ["folder-1"],
                modifiedTime: "2026-04-15T00:00:00Z",
                webViewLink: "https://docs.google.com/document/d/f2/edit",
              },
            ],
            nextPageToken: "next-cursor",
          }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "folder-1", name: "工程組" }),
      });

      const result = await connector.searchImportableFiles({ query: "doc" });

      expect(result.files).toHaveLength(2);
      expect(result.files[0].parentLabel).toBe("工程組");
      expect(result.files[1].parentLabel).toBe("工程組");
      expect(result.nextCursor).toBe("next-cursor");
      expect(result.hasMore).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("returns empty parentLabel when file has no parents", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            files: [
              {
                id: "f1",
                name: "Doc A",
                mimeType: "application/vnd.google-apps.document",
                modifiedTime: "2026-04-16T00:00:00Z",
                webViewLink: "https://docs.google.com/document/d/f1/edit",
              },
            ],
          }),
      });

      const result = await connector.searchImportableFiles({ query: "" });
      expect(result.files[0].parentLabel).toBe("");
      expect(result.hasMore).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("falls back to '—' when parent fetch fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            files: [
              {
                id: "f1",
                name: "Doc A",
                mimeType: "application/vnd.google-apps.document",
                parents: ["unknown-folder"],
                modifiedTime: "2026-04-16T00:00:00Z",
                webViewLink: "https://docs.google.com/document/d/f1/edit",
              },
            ],
          }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve("not found"),
      });

      const result = await connector.searchImportableFiles({ query: "" });
      expect(result.files[0].parentLabel).toBe("—");
    });
  });

  describe("exportDocAsMarkdown", () => {
    beforeEach(async () => {
      await connector.connect();
    });

    it("calls Drive export endpoint with text/markdown mime type", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("# Title\n\nbody"),
      });

      const text = await connector.exportDocAsMarkdown("doc-1");

      expect(text).toBe("# Title\n\nbody");
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("/files/doc-1/export");
      expect(url).toContain("mimeType=text%2Fmarkdown");
    });
  });

  describe("exportSheetAsCsv", () => {
    beforeEach(async () => {
      await connector.connect();
    });

    it("calls Drive export endpoint with text/csv mime type", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("name,age\n王小明,30\n"),
      });

      const csv = await connector.exportSheetAsCsv("sheet-1");

      expect(csv).toBe("name,age\n王小明,30\n");
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("/files/sheet-1/export");
      expect(url).toContain("mimeType=text%2Fcsv");
    });
  });
});
